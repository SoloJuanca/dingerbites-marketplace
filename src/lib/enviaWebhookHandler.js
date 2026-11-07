import {
  buildTrackingUrl,
  normalizeEnviaEvent,
  shouldNotifyCustomer
} from './enviaWebhooks';
import {
  applyEnviaWebhookToOrder,
  findOrderByEnviaWebhook,
  getEnviaWebhookEventByKey,
  recordEnviaWebhookEvent
} from './firebaseOrders';
import { db } from './firebaseAdmin';
import {
  sendShipmentUpdateEmail,
  sendSurchargeAlertEmail
} from './shipmentNotifications';

const ORDERS_COLLECTION = 'orders';

async function markOrderNotified(orderId, status) {
  await db.collection(ORDERS_COLLECTION).doc(String(orderId)).update({
    last_notified_status: status,
    updated_at: new Date().toISOString()
  });
}

export async function processEnviaWebhookEvent(event) {
  if (event.eventType === 'surcharge' || event.status === 'surcharge') {
    const order = await findOrderByEnviaWebhook({
      trackingNumber: event.trackingNumber,
      shipmentId: event.shipmentId,
      orderReference: event.orderReference
    });

    await sendSurchargeAlertEmail({
      orderNumber: order?.order_number || event.orderReference,
      trackingNumber: event.trackingNumber,
      surcharge: event.surcharge
    });

    return { handled: true, type: 'surcharge' };
  }

  const order = await findOrderByEnviaWebhook({
    trackingNumber: event.trackingNumber,
    shipmentId: event.shipmentId,
    orderReference: event.orderReference
  });

  if (!order) {
    console.warn('Envia webhook: order not found', {
      trackingNumber: event.trackingNumber,
      shipmentId: event.shipmentId,
      orderReference: event.orderReference
    });
    return { handled: false, reason: 'order_not_found' };
  }

  const previousNotified = order.last_notified_status || null;
  const updatedOrder = await applyEnviaWebhookToOrder(order, event);

  let emailResult = { skipped: true };
  if (
    shouldNotifyCustomer(event.status, previousNotified)
    && (updatedOrder?.customer_email || order.customer_email)
  ) {
    emailResult = await sendShipmentUpdateEmail({
      to: updatedOrder?.customer_email || order.customer_email,
      customerName: updatedOrder?.customer_name || order.customer_name,
      orderNumber: updatedOrder?.order_number || order.order_number,
      status: event.status,
      trackingNumber: event.trackingNumber || updatedOrder?.tracking_id || order.tracking_id,
      carrier: event.carrier || updatedOrder?.carrier_company || order.carrier_company,
      trackingUrl: buildTrackingUrl({
        carrier: event.carrier || updatedOrder?.carrier_company || order.carrier_company,
        trackingNumber: event.trackingNumber || updatedOrder?.tracking_id || order.tracking_id,
        trackingUrl: event.trackingUrl || updatedOrder?.tracking_url || order.tracking_url
      }),
      statusDescription: event.statusDescription,
      location: event.location
    });

    if (emailResult?.success !== false) {
      await markOrderNotified(order.id, event.status);
    }
  }

  return {
    handled: true,
    orderId: order.id,
    email: emailResult
  };
}

export async function handleEnviaWebhookRequest(request, rawBody, parsedBody) {
  const event = normalizeEnviaEvent(parsedBody, request.headers);
  const existing = await getEnviaWebhookEventByKey(event.eventKey);

  if (existing) {
    return { duplicate: true, event };
  }

  const result = await processEnviaWebhookEvent(event);

  await recordEnviaWebhookEvent({
    eventKey: event.eventKey,
    eventType: event.eventType,
    trackingNumber: event.trackingNumber,
    payload: event.raw
  });

  return { duplicate: false, event, result };
}
