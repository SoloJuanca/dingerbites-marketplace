import { db } from './firebaseAdmin';
import { getOrderStatusIdByName, cancelOrder } from './firebaseOrders';
import { restoreProductStockForOrder } from './orderStock';
import { getStripe, isStripeConfigured } from './stripeServer';
export const OXXO_MIN_MXN = 10;
export const OXXO_MAX_MXN = 10000;

export function isOxxoEligibleTotal(totalMxn) {
  const total = Number(totalMxn);
  return Number.isFinite(total) && total >= OXXO_MIN_MXN && total <= OXXO_MAX_MXN;
}

export function extractOxxoDetailsFromPaymentIntent(paymentIntent) {
  const details =
    paymentIntent?.next_action?.oxxo_display_details ||
    paymentIntent?.charges?.data?.[0]?.payment_method_details?.oxxo;

  if (!details) return null;

  const hostedVoucherUrl = details.hosted_voucher_url || null;
  const referenceNumber = details.number || details.reference_number || null;
  let expiresAt = null;
  if (details.expires_after != null) {
    const expiresAfterSec = Number(details.expires_after);
    if (Number.isFinite(expiresAfterSec) && expiresAfterSec > 0) {
      expiresAt = new Date(expiresAfterSec * 1000).toISOString();
    }
  } else if (details.expires_at) {
    expiresAt =
      typeof details.expires_at === 'number'
        ? new Date(details.expires_at * 1000).toISOString()
        : String(details.expires_at);
  }

  return {
    oxxo_hosted_voucher_url: hostedVoucherUrl,
    oxxo_reference_number: referenceNumber,
    oxxo_expires_at: expiresAt
  };
}

export async function findOrderByPaymentIntentId(piId) {
  const snap = await db
    .collection('orders')
    .where('stripe_payment_intent_id', '==', piId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Marks an awaiting_oxxo order as paid after Stripe confirms payment.
 */
export async function markOxxoOrderPaid(orderId, { paymentIntentId = null } = {}) {
  const orderRef = db.collection('orders').doc(String(orderId));
  const confirmedId = await getOrderStatusIdByName('confirmed');
  const now = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists) {
      const err = new Error('Order not found');
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }
    const order = snap.data();
    if (order.payment_status === 'paid') return;

    const updates = {
      payment_status: 'paid',
      updated_at: now
    };
    if (paymentIntentId) {
      updates.stripe_payment_intent_id = paymentIntentId;
    }
    if (confirmedId && order.status_id !== confirmedId) {
      updates.status_id = confirmedId;
      const history = Array.isArray(order.history) ? [...order.history] : [];
      history.push({
        status_id: confirmedId,
        notes: 'Pago OXXO confirmado',
        created_at: now
      });
      updates.history = history;
    }
    transaction.update(orderRef, updates);
  });

  const updated = await orderRef.get();
  const orderData = { id: updated.id, ...updated.data() };

  try {
    const { sendOrderNotifications } = await import('./emailService');
    await sendOrderNotifications({
      order_number: orderData.order_number,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      customer_phone: orderData.customer_phone,
      total_amount: orderData.total_amount,
      payment_method: orderData.payment_method || 'Stripe (OXXO)',
      shipping_method: orderData.shipping_method,
      items: orderData.items || [],
      service_items: orderData.service_items || [],
      address: null,
      notes: orderData.notes,
      created_at: orderData.created_at
    });
  } catch (emailErr) {
    console.error('OXXO paid confirmation email failed:', emailErr);
  }

  return orderData;
}

/**
 * Cancels awaiting OXXO order and restores stock. Idempotent.
 */
export async function cancelAwaitingOxxoOrder(orderId, { cancelStripePi = true } = {}) {
  const orderRef = db.collection('orders').doc(String(orderId));
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    const err = new Error('Order not found');
    err.code = 'ORDER_NOT_FOUND';
    throw err;
  }
  const orderData = orderSnap.data();

  if (orderData.payment_status === 'paid') {
    return { cancelled: false, reason: 'already_paid' };
  }

  if (orderData.payment_status === 'cancelled') {
    return { cancelled: false, reason: 'already_cancelled' };
  }

  if (orderData.stock_reserved === true) {
    await restoreProductStockForOrder(orderId);
  }

  if (
    cancelStripePi &&
    isStripeConfigured() &&
    orderData.stripe_payment_intent_id &&
    String(orderData.stripe_payment_intent_id).startsWith('pi_')
  ) {
    try {
      const stripe = getStripe();
      const pi = await stripe.paymentIntents.retrieve(orderData.stripe_payment_intent_id);
      if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
        await stripe.paymentIntents.cancel(orderData.stripe_payment_intent_id);
      }
    } catch (stripeErr) {
      console.warn('Could not cancel Stripe PaymentIntent:', stripeErr.message);
    }
  }

  await cancelOrder(orderId);
  await orderRef.update({
    payment_status: 'cancelled',
    updated_at: new Date().toISOString()
  });

  return { cancelled: true };
}

export async function handleOxxoPaymentIntentCanceled(piId) {
  const order = await findOrderByPaymentIntentId(piId);
  if (!order) return { handled: false, reason: 'no_order' };
  if (order.payment_status !== 'awaiting_oxxo') {
    return { handled: false, reason: 'not_awaiting_oxxo' };
  }
  await cancelAwaitingOxxoOrder(order.id, { cancelStripePi: false });
  return { handled: true };
}
