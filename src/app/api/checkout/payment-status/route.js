import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebaseAdmin';
import { getStripe, isStripeConfigured } from '../../../../lib/stripeServer';
import { ensureOrderForPaymentIntent } from '../../../../lib/stripePaymentIntentFinalize';

export const runtime = 'nodejs';

function shippingMethodToDeliveryType(shippingMethod) {
  if (shippingMethod === 'Envío a domicilio') return 'delivery';
  if (shippingMethod === 'Recoger en punto') return 'pickup';
  return 'delivery';
}

function buildOrderReadyJson(order, paymentIntentStatus) {
  const shippingMethod = order.shipping_method || '';
  const deliveryType = shippingMethodToDeliveryType(shippingMethod);
  return {
    paid: true,
    order_ready: true,
    payment_intent_status: paymentIntentStatus,
    order: {
      order_number: order.order_number,
      total_amount: order.total_amount,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone || null,
      customer_name: order.customer_name || null,
      payment_method: 'stripe',
      delivery_type: deliveryType,
      pickup_point: order.pickup_point || null,
      shipping_method: shippingMethod
    }
  };
}

/**
 * GET /api/checkout/payment-status?payment_intent=pi_...
 * Polls Stripe PI + Firestore order. Supports OXXO/processing and webhook delay after succeeded.
 */
export async function GET(request) {
  try {
    const piId = request.nextUrl.searchParams.get('payment_intent');
    if (!piId || !piId.startsWith('pi_')) {
      return NextResponse.json({ error: 'payment_intent inválido' }, { status: 400 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 503 });
    }

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(piId);

    const status = pi.status;

    const ordersSnap = await db
      .collection('orders')
      .where('stripe_payment_intent_id', '==', piId)
      .limit(1)
      .get();

    if (!ordersSnap.empty) {
      return NextResponse.json(buildOrderReadyJson(ordersSnap.docs[0].data(), status));
    }

    /** Webhook may not reach localhost; create the order here (idempotent with webhook). */
    if (status === 'succeeded') {
      try {
        const finalized = await ensureOrderForPaymentIntent(stripe, piId, {
          ip: 'checkout-payment-status',
          userAgent: 'next-server',
          requestId: `poll-${piId}`
        });
        if (finalized.status === 'exists' || finalized.status === 'created') {
          return NextResponse.json(buildOrderReadyJson(finalized.order, status));
        }
        if (finalized.status === 'error' && finalized.reason === 'insufficient_stock') {
          return NextResponse.json({
            paid: true,
            order_ready: false,
            payment_intent_status: status,
            keep_polling: false,
            fatal: true,
            reason: 'insufficient_stock',
            message:
              finalized.message ||
              'El stock se agotó antes de registrar tu pedido. Si el cargo ya apareció, contacta a soporte.'
          });
        }
      } catch (finalizeErr) {
        console.error('payment-status finalize error:', finalizeErr);
      }
    }

    if (status === 'succeeded') {
      return NextResponse.json({
        paid: true,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: true,
        message: 'Pago recibido. Registrando tu pedido…'
      });
    }

    if (status === 'processing' || status === 'requires_action') {
      return NextResponse.json({
        paid: true,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: true,
        message:
          status === 'processing'
            ? 'Tu pago está en proceso (por ejemplo OXXO). Espera la confirmación o revisa tu correo.'
            : 'Completa el paso pendiente del pago.'
      });
    }

    if (status === 'canceled') {
      return NextResponse.json({
        paid: false,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: false,
        fatal: true,
        message: 'El pago fue cancelado.'
      });
    }

    if (status === 'requires_payment_method') {
      const errMsg = pi.last_payment_error?.message;
      return NextResponse.json({
        paid: false,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: false,
        fatal: true,
        message: errMsg || 'El pago no pudo completarse. Prueba otro método o tarjeta.'
      });
    }

    return NextResponse.json({
      paid: false,
      order_ready: false,
      payment_intent_status: status,
      keep_polling: false,
      fatal: false,
      message: 'Estado de pago pendiente.'
    });
  } catch (error) {
    console.error('payment-status error:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo verificar el pago' },
      { status: 500 }
    );
  }
}
