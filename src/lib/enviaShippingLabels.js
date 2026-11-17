import { db } from './firebaseAdmin';
import { buildShippingPackagePlanForItems } from './shippingPackageQuote';
import {
  getEnviaLabelResponseData,
  generateShipmentLabel,
  getEnviaOrigin,
  getEnviaRateOptions,
  isEnviaInsufficientFundsError,
  normalizeEnviaAddress,
  quoteShipment
} from './envia';
import { buildTrackingUrl } from './enviaWebhooks';
import { getStripe } from './stripeServer';
import { sendShippingLabelFundsAlertEmail } from './shipmentNotifications';

const ORDERS_COLLECTION = 'orders';
const LABEL_URL_PATTERN = /^https?:\/\//i;

function getSelectedRateIdentifiers(option) {
  if (!option?.id) {
    throw new Error('El pedido no tiene una opción de envío seleccionada.');
  }

  try {
    const [carrier, service] = JSON.parse(decodeURIComponent(option.id));
    if (typeof carrier === 'string' && typeof service === 'string' && carrier && service) {
      return { carrier, service };
    }
  } catch {
    // Older orders may contain a non-encoded option ID.
  }

  throw new Error('No se pudieron recuperar la paquetería y el servicio seleccionados.');
}

function buildEnviaAddresses(order, origin) {
  const address = order.shipping_address;
  if (!address || typeof address !== 'object') {
    throw new Error('El pedido no contiene una dirección de envío completa.');
  }

  const destination = normalizeEnviaAddress({
    name:
      [address.first_name, address.last_name].filter(Boolean).join(' ').trim()
      || order.customer_name
      || '',
    email: order.customer_email || '',
    phone: address.phone || order.customer_phone || order.phone || '',
    street: address.address_line_1 || '',
    number: '',
    district: address.address_line_2 || '',
    city: address.city || '',
    state: address.state || '',
    country: address.country === 'Mexico' ? 'MX' : address.country || 'MX',
    postalCode: address.postal_code || ''
  });
  const normalizedOrigin = normalizeEnviaAddress(origin);
  const required = ['name', 'phone', 'street', 'city', 'state', 'postalCode'];
  const missing = required.filter((field) => !String(destination[field] || '').trim());
  if (missing.length) {
    throw new Error(`Faltan datos de la dirección para crear la guía: ${missing.join(', ')}.`);
  }
  if (!normalizedOrigin.phone) {
    throw new Error('Configura ENVIA_ORIGIN_PHONE para poder crear la guía.');
  }

  return { origin: normalizedOrigin, destination };
}

function validateRateStillMatches({ quote, carrier, service, expectedAmount }) {
  const ratesKey = Array.isArray(quote?.data) ? 'data' : 'quotes';
  const rates = Array.isArray(quote?.[ratesKey]) ? quote[ratesKey] : [];
  const normalizedQuote = {
    ...quote,
    [ratesKey]: rates.map((rate) => ({
      ...rate,
      carrier: rate.carrier || carrier,
      carrierCode: rate.carrierCode || rate.carrier_code || carrier
    }))
  };
  const matchingOption = getEnviaRateOptions(normalizedQuote)
    .find((option) => option.id === encodeURIComponent(JSON.stringify([carrier, service])));
  if (!matchingOption) {
    throw new Error('La paquetería o el servicio seleccionado ya no está disponible en Envia.');
  }

  if (Math.abs(matchingOption.price - Number(expectedAmount)) > 1) {
    throw new Error(
      'El precio de envío cambió desde la cotización. No se creó la guía para evitar un cargo inesperado.'
    );
  }
}

async function claimLabelCreation(orderId, { retryFailed, retryNeedsReview }) {
  const orderRef = db.collection(ORDERS_COLLECTION).doc(String(orderId));
  return db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      const error = new Error('Pedido no encontrado.');
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    const order = { id: orderDoc.id, ...orderDoc.data() };
    if (order.tracking_id || order.envia_shipment_id || order.shipping_label_url) {
      return { status: 'already_created', order };
    }
    if (order.shipping_label_status === 'creating') {
      const lastUpdate = Date.parse(order.shipping_label_updated_at || '');
      if (Number.isFinite(lastUpdate) && Date.now() - lastUpdate > 10 * 60 * 1000) {
        transaction.update(orderRef, {
          shipping_label_status: 'needs_review',
          shipping_label_error: 'La solicitud de creación tardó demasiado y su resultado es incierto. Revisa Envia antes de reintentar.',
          shipping_label_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return { status: 'needs_review', order };
      }
      return { status: 'creating', order };
    }
    if (order.shipping_label_status === 'needs_review' && !retryNeedsReview) {
      return { status: 'needs_review', order };
    }
    if (['failed', 'insufficient_funds'].includes(order.shipping_label_status) && !retryFailed) {
      return { status: 'failed', order };
    }
    if (order.shipping_method !== 'Envío a domicilio') {
      const error = new Error('El pedido no es un envío a domicilio.');
      error.code = 'NOT_DELIVERY_ORDER';
      throw error;
    }

    transaction.update(orderRef, {
      shipping_label_status: 'creating',
      shipping_label_error: null,
      shipping_label_failure_notified_at: null,
      shipping_label_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return { status: 'claimed', order };
  });
}

async function updateLabelStatus(orderId, status, fields = {}) {
  const now = new Date().toISOString();
  await db.collection(ORDERS_COLLECTION).doc(String(orderId)).update({
    ...fields,
    shipping_label_status: status,
    shipping_label_updated_at: now,
    updated_at: now
  });
}

export async function createEnviaShippingLabelForOrder(
  orderId,
  { retryFailed = false, retryNeedsReview = false, paymentConfirmed = false } = {}
) {
  const orderDoc = await db.collection(ORDERS_COLLECTION).doc(String(orderId)).get();
  if (!orderDoc.exists) {
    const error = new Error('Pedido no encontrado.');
    error.code = 'ORDER_NOT_FOUND';
    throw error;
  }
  const initialOrder = { id: orderDoc.id, ...orderDoc.data() };
  if (initialOrder.shipping_method !== 'Envío a domicilio') {
    return { status: 'not_delivery' };
  }
  if (!paymentConfirmed) {
    const stripe = getStripe();
    const isPaymentIntentPaid = initialOrder.stripe_payment_intent_id
      ? (await stripe.paymentIntents.retrieve(initialOrder.stripe_payment_intent_id)).status === 'succeeded'
      : false;
    const isCheckoutSessionPaid = initialOrder.stripe_checkout_session_id
      ? (await stripe.checkout.sessions.retrieve(initialOrder.stripe_checkout_session_id)).payment_status === 'paid'
      : false;
    if (!isPaymentIntentPaid && !isCheckoutSessionPaid) {
      const error = new Error('El pago del pedido todavía no está confirmado.');
      error.code = 'STRIPE_PAYMENT_NOT_CONFIRMED';
      throw error;
    }
  }

  const claim = await claimLabelCreation(orderId, { retryFailed, retryNeedsReview });
  if (claim.status !== 'claimed') return claim;

  let order = claim.order;
  let generateRequestStarted = false;
  try {
    const { carrier, service } = getSelectedRateIdentifiers(order.shipping_option);
    const origin = getEnviaOrigin();
    const { origin: normalizedOrigin, destination } = buildEnviaAddresses(order, origin);
    const items = (Array.isArray(order.items) ? order.items : []).map((item) => ({
      product_id: item.product_id || item.id,
      quantity: item.quantity
    }));
    const packagePlan = await buildShippingPackagePlanForItems(items);

    const rateQuote = await quoteShipment({
      origin: normalizedOrigin,
      destination,
      packages: packagePlan.packages,
      carrier
    });
    validateRateStillMatches({
      quote: rateQuote,
      carrier,
      service,
      expectedAmount: order.shipping_amount
    });

    generateRequestStarted = true;
    const responseBody = await generateShipmentLabel({
      origin: normalizedOrigin,
      destination: {
        ...destination,
        reference: order.order_number || order.id
      },
      packages: packagePlan.packages,
      shipment: { type: 1, carrier, service },
      settings: {
        currency: 'MXN',
        printFormat: 'PDF',
        printSize: 'PAPER_4X6',
        comments: `Pedido ${order.order_number || order.id}`
      }
    });

    const result = getEnviaLabelResponseData(responseBody);
    const trackingId = result.trackingNumber || result.tracking_number || result.trackingId || result.tracking_id || null;
    const shipmentId = result.shipmentId || result.shipment_id || result.id || null;
    const labelValue = result.label || result.labelUrl || result.label_url || result.pdf || null;
    const labelUrl = typeof labelValue === 'string' && LABEL_URL_PATTERN.test(labelValue) ? labelValue : null;
    if (!trackingId && !shipmentId && !labelUrl) {
      const responseFields = Object.keys(result).slice(0, 12).join(', ');
      await updateLabelStatus(order.id, 'needs_review', {
        shipping_label_error: `Envia respondió sin número de guía, ID del envío ni URL de etiqueta.${responseFields ? ` Campos recibidos: ${responseFields}.` : ' La respuesta no incluyó datos.'}`
      });
      return { status: 'needs_review' };
    }

    const carrierName = result.carrier || result.carrierName || order.shipping_option?.carrier || carrier;
    const trackingUrl = result.trackingUrl || result.tracking_url || buildTrackingUrl({
      carrier: carrierName,
      trackingNumber: trackingId
    });
    await updateLabelStatus(order.id, 'purchased', {
      tracking_id: trackingId ? String(trackingId) : null,
      tracking_number: trackingId ? String(trackingId) : null,
      carrier_company: String(carrierName),
      tracking_url: trackingUrl,
      envia_shipment_id: shipmentId ? String(shipmentId) : null,
      shipping_label_url: labelUrl,
      shipping_label_error: null
    });
    return {
      status: 'purchased',
      tracking_id: trackingId ? String(trackingId) : null,
      tracking_url: trackingUrl,
      shipping_label_url: labelUrl
    };
  } catch (error) {
    const insufficientFunds = isEnviaInsufficientFundsError(error);
    const status =
      insufficientFunds
        ? 'insufficient_funds'
        : !generateRequestStarted || error.definitive
          ? 'failed'
        : 'needs_review';
    await updateLabelStatus(order.id, status, {
      shipping_label_error: String(error.message || 'No se pudo confirmar el resultado con Envia.').slice(0, 500)
    });
    if (insufficientFunds && !order.shipping_label_failure_notified_at) {
      const emailResult = await sendShippingLabelFundsAlertEmail({
        orderNumber: order.order_number,
        carrier: order.shipping_option?.carrier,
        shippingAmount: order.shipping_amount,
        error: error.message
      });
      if (emailResult?.success) {
        await updateLabelStatus(order.id, status, {
          shipping_label_failure_notified_at: new Date().toISOString()
        });
      } else {
        console.error('Admin alert email for insufficient Envia funds failed', {
          order_id: order.id,
          error: emailResult?.error || 'Unknown email error'
        });
      }
    }
    console.error('Envia shipping label creation failed', {
      order_id: order.id,
      order_number: order.order_number || null,
      code: error.code || 'ENVIA_LABEL_FAILED',
      status
    });
    return { status, error: error.message || 'No se pudo crear la guía.' };
  }
}
