import { createOrderFromPayload } from './orderCreation';
import { db } from './firebaseAdmin';
import { PENDING_STRIPE_CHECKOUTS_COLLECTION } from './pendingStripeCheckout';

/**
 * Ensures a Firestore order exists for a succeeded PaymentIntent by reading the pending
 * checkout doc (same rules as the Stripe webhook). Idempotent: safe if the webhook already ran.
 *
 * @param {import('stripe').Stripe} stripe
 * @param {string} piId
 * @param {{ ip?: string, userAgent?: string, requestId?: string }} requestMeta
 * @returns {Promise<
 *   | { status: 'exists'; order: object }
 *   | { status: 'created'; order: object }
 *   | { status: 'not_succeeded'; payment_intent_status: string }
 *   | { status: 'skipped'; reason: 'missing_metadata' | 'pending_missing' }
 *   | { status: 'error'; reason: string; message?: string }
 * >}
 */
export async function ensureOrderForPaymentIntent(stripe, piId, requestMeta = {}) {
  const existingSnap = await db
    .collection('orders')
    .where('stripe_payment_intent_id', '==', piId)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return { status: 'exists', order: existingSnap.docs[0].data() };
  }

  const fullPi = await stripe.paymentIntents.retrieve(piId);
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
    const retrySnap = await db
      .collection('orders')
      .where('stripe_payment_intent_id', '==', piId)
      .limit(1)
      .get();
    if (!retrySnap.empty) {
      return { status: 'exists', order: retrySnap.docs[0].data() };
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

  const dupSnap = await db
    .collection('orders')
    .where('stripe_payment_intent_id', '==', piId)
    .limit(1)
    .get();
  if (!dupSnap.empty) {
    return { status: 'exists', order: dupSnap.docs[0].data() };
  }

  const orderBody = {
    ...pending.order_body,
    user_id: pending.auth_user_id || pending.order_body?.user_id || null
  };

  const authUser = pending.auth_user_id ? { id: pending.auth_user_id } : null;

  const meta = {
    ip: requestMeta.ip || 'stripe',
    userAgent: requestMeta.userAgent || 'stripe',
    requestId: requestMeta.requestId || piId
  };

  await createOrderFromPayload({
    body: orderBody,
    authUser,
    requestMeta: meta,
    options: {
      skipEmail: false,
      stripePaymentIntentId: piId
    }
  });

  await pendingRef.delete().catch(() => {});

  const finalSnap = await db
    .collection('orders')
    .where('stripe_payment_intent_id', '==', piId)
    .limit(1)
    .get();

  if (finalSnap.empty) {
    return { status: 'error', reason: 'order_not_found_after_create' };
  }

  return { status: 'created', order: finalSnap.docs[0].data() };
}
