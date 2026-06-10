import { createOrderFromPayload } from './orderCreation';
import { db } from './firebaseAdmin';
import { PENDING_STRIPE_CHECKOUTS_COLLECTION } from './pendingStripeCheckout';
import { findOrderByPaymentIntentId, markOxxoOrderPaid } from './oxxoOrders';

/**
 * Ensures a Firestore order exists for a succeeded PaymentIntent by reading the pending
 * checkout doc (same rules as the Stripe webhook). Idempotent: safe if the webhook already ran.
 *
 * @param {import('stripe').Stripe} stripe
 * @param {string} piId
 * @param {{ ip?: string, userAgent?: string, requestId?: string }} requestMeta
 * @returns {Promise<object>}
 */
export async function ensureOrderForPaymentIntent(stripe, piId, requestMeta = {}) {
  const fullPi = await stripe.paymentIntents.retrieve(piId);
  const existingOrder = await findOrderByPaymentIntentId(piId);

  if (existingOrder) {
    if (existingOrder.payment_status === 'awaiting_oxxo' && fullPi.status === 'succeeded') {
      const updated = await markOxxoOrderPaid(existingOrder.id, { paymentIntentId: piId });
      return { status: 'updated', order: updated };
    }
    if (existingOrder.payment_status === 'cancelled') {
      return {
        status: 'error',
        reason: 'order_cancelled',
        payment_intent_status: fullPi.status
      };
    }
    return { status: 'exists', order: existingOrder };
  }

  if (fullPi.status !== 'succeeded') {
    return { status: 'not_succeeded', payment_intent_status: fullPi.status };
  }

  const pendingId = fullPi.metadata?.pending_checkout_id;
  if (!pendingId) {
    return { status: 'skipped', reason: 'missing_metadata' };
  }

  const pendingRef = db.collection(PENDING_STRIPE_CHECKOUTS_COLLECTION).doc(pendingId);
  const pendingDoc = await pendingRef.get();

  if (!pendingDoc.exists) {
    const retryOrder = await findOrderByPaymentIntentId(piId);
    if (retryOrder) {
      return { status: 'exists', order: retryOrder };
    }
    return { status: 'skipped', reason: 'pending_missing' };
  }

  const pending = pendingDoc.data();
  const received = fullPi.amount_received ?? fullPi.amount;
  const expected = pending.expected_amount_cents;
  if (
    typeof received !== 'number' ||
    typeof expected !== 'number' ||
    Math.abs(received - expected) > 1
  ) {
    return { status: 'error', reason: 'amount_mismatch' };
  }

  const dupOrder = await findOrderByPaymentIntentId(piId);
  if (dupOrder) {
    if (dupOrder.payment_status === 'awaiting_oxxo') {
      const updated = await markOxxoOrderPaid(dupOrder.id, { paymentIntentId: piId });
      return { status: 'updated', order: updated };
    }
    return { status: 'exists', order: dupOrder };
  }

  const orderBody = {
    ...pending.order_body,
    user_id: pending.auth_user_id || pending.order_body?.user_id || null,
    payment_method: 'Stripe',
    payment_status: 'paid',
    stripe_payment_method_type: 'card'
  };

  const authUser = pending.auth_user_id ? { id: pending.auth_user_id } : null;

  const meta = {
    ip: requestMeta.ip || 'stripe',
    userAgent: requestMeta.userAgent || 'stripe',
    requestId: requestMeta.requestId || piId
  };

  try {
    await createOrderFromPayload({
      body: orderBody,
      authUser,
      requestMeta: meta,
      options: {
        skipEmail: false,
        stripePaymentIntentId: piId,
        prePricedOrderItems: pending.priced_order_items ?? null,
        prePricedServiceItems: pending.priced_service_items ?? null
      }
    });
  } catch (err) {
    const code = err?.code;
    if (code === 'INSUFFICIENT_STOCK' || code === 'PRODUCT_NOT_FOUND') {
      return {
        status: 'error',
        reason: 'insufficient_stock',
        message:
          err?.message ||
          'El stock se agotó antes de registrar tu pedido. Si el cargo ya apareció, contacta a soporte.'
      };
    }
    throw err;
  }

  await pendingRef.delete().catch(() => {});

  const finalOrder = await findOrderByPaymentIntentId(piId);
  if (!finalOrder) {
    return { status: 'error', reason: 'order_not_found_after_create' };
  }

  return { status: 'created', order: finalOrder };
}
