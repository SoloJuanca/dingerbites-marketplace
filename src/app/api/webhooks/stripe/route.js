import { NextResponse } from 'next/server';
import { createOrderFromPayload } from '../../../../lib/orderCreation';
import { db } from '../../../../lib/firebaseAdmin';
import { getStripe, isStripeConfigured } from '../../../../lib/stripeServer';
import { ensureOrderForPaymentIntent } from '../../../../lib/stripePaymentIntentFinalize';
import { PENDING_STRIPE_CHECKOUTS_COLLECTION } from '../../../../lib/pendingStripeCheckout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleCheckoutSessionCompleted(event, stripe) {
  const session = event.data.object;
  const sessionId = session.id;

  const existingSnap = await db
    .collection('orders')
    .where('stripe_checkout_session_id', '==', sessionId)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const pendingId = session.metadata?.pending_checkout_id;
  if (!pendingId) {
    console.error('checkout.session.completed missing pending_checkout_id metadata', sessionId);
    return NextResponse.json({ received: true, skipped: true });
  }

  const pendingRef = db.collection(PENDING_STRIPE_CHECKOUTS_COLLECTION).doc(pendingId);
  const pendingDoc = await pendingRef.get();

  if (!pendingDoc.exists) {
    const retrySnap = await db
      .collection('orders')
      .where('stripe_checkout_session_id', '==', sessionId)
      .limit(1)
      .get();
    if (!retrySnap.empty) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Pending checkout not found for Stripe session', sessionId, pendingId);
    return NextResponse.json({ received: true, pending_missing: true });
  }

  const pending = pendingDoc.data();

  const fullSession = await stripe.checkout.sessions.retrieve(sessionId);

  if (fullSession.payment_status !== 'paid') {
    console.warn('Session not paid, skipping order creation', sessionId, fullSession.payment_status);
    return NextResponse.json({ received: true, not_paid: true });
  }

  const amountTotal = fullSession.amount_total;
  const expected = pending.expected_amount_cents;
  if (
    typeof amountTotal !== 'number' ||
    typeof expected !== 'number' ||
    Math.abs(amountTotal - expected) > 1
  ) {
    console.error('Amount mismatch for Stripe session', {
      sessionId,
      amountTotal,
      expected
    });
    return NextResponse.json({ received: true, amount_mismatch: true });
  }

  const orderBody = {
    ...pending.order_body,
    user_id: pending.auth_user_id || pending.order_body?.user_id || null
  };

  const requestMeta = {
    ip: 'stripe-webhook',
    userAgent: 'stripe',
    requestId: event.id
  };

  const authUser = pending.auth_user_id ? { id: pending.auth_user_id } : null;

  await createOrderFromPayload({
    body: orderBody,
    authUser,
    requestMeta,
    options: {
      skipEmail: false,
      stripeCheckoutSessionId: sessionId
    }
  });

  await pendingRef.delete().catch(() => {});
  return NextResponse.json({ received: true });
}

async function handlePaymentIntentSucceeded(event, stripe) {
  const pi = event.data.object;
  const piId = pi.id;

  const result = await ensureOrderForPaymentIntent(stripe, piId, {
    ip: 'stripe-webhook',
    userAgent: 'stripe',
    requestId: event.id
  });

  if (result.status === 'exists') {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (result.status === 'created') {
    return NextResponse.json({ received: true });
  }
  if (result.status === 'not_succeeded') {
    console.warn('PI not succeeded, skipping order', piId, result.payment_intent_status);
    return NextResponse.json({ received: true, not_succeeded: true });
  }
  if (result.status === 'skipped') {
    if (result.reason === 'missing_metadata') {
      console.error('payment_intent.succeeded missing pending_checkout_id metadata', piId);
      return NextResponse.json({ received: true, skipped: true });
    }
    console.error('Pending checkout not found for PaymentIntent', piId);
    return NextResponse.json({ received: true, pending_missing: true });
  }
  if (result.status === 'error' && result.reason === 'amount_mismatch') {
    console.error('Amount mismatch for PaymentIntent', piId);
    return NextResponse.json({ received: true, amount_mismatch: true });
  }
  console.error('ensureOrderForPaymentIntent failed', piId, result);
  return NextResponse.json({ received: true, error: result.reason || 'finalize_failed' });
}

/**
 * Stripe sends raw body; signature verification requires the exact payload bytes.
 */
export async function POST(request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is missing');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      return await handleCheckoutSessionCompleted(event, stripe);
    }
    if (event.type === 'payment_intent.succeeded') {
      return await handlePaymentIntentSucceeded(event, stripe);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
