import { NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '../../../../lib/stripeServer';
import { ensureOrderForPaymentIntent } from '../../../../lib/stripePaymentIntentFinalize';
import { findOrderByPaymentIntentId } from '../../../../lib/oxxoOrders';

export const runtime = 'nodejs';

function shippingMethodToDeliveryType(shippingMethod) {
  if (shippingMethod === 'Envío a domicilio') return 'delivery';
  if (shippingMethod === 'Recoger en punto') return 'pickup';
  return 'delivery';
}

function buildOrderPayload(order) {
  const shippingMethod = order.shipping_method || '';
  return {
    order_id: order.id,
    order_number: order.order_number,
    total_amount: order.total_amount,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone || null,
    customer_name: order.customer_name || null,
    payment_method: order.payment_method || 'Stripe',
    payment_status: order.payment_status || null,
    delivery_type: shippingMethodToDeliveryType(shippingMethod),
    pickup_point: order.pickup_point || null,
    shipping_method: shippingMethod,
    oxxo_hosted_voucher_url: order.oxxo_hosted_voucher_url || null,
    oxxo_reference_number: order.oxxo_reference_number || null,
    oxxo_expires_at: order.oxxo_expires_at || null
  };
}

function buildOrderReadyJson(order, paymentIntentStatus, { awaitingPayment = false } = {}) {
  const isPaid = order.payment_status === 'paid' || (!awaitingPayment && order.payment_status !== 'awaiting_oxxo');
  return {
    paid: isPaid,
    order_ready: true,
    awaiting_payment: awaitingPayment,
    payment_intent_status: paymentIntentStatus,
    order: buildOrderPayload(order)
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

    let order = await findOrderByPaymentIntentId(piId);

    if (order) {
      if (order.payment_status === 'cancelled') {
        return NextResponse.json({
          paid: false,
          order_ready: false,
          payment_intent_status: status,
          keep_polling: false,
          fatal: true,
          message: 'El pedido fue cancelado. El stock fue liberado.'
        });
      }

      if (order.payment_status === 'awaiting_oxxo') {
        if (status === 'succeeded') {
          const finalized = await ensureOrderForPaymentIntent(stripe, piId, {
            ip: 'checkout-payment-status',
            userAgent: 'next-server',
            requestId: `poll-${piId}`
          });
          if (finalized.status === 'updated' || finalized.status === 'exists' || finalized.status === 'created') {
            const paidOrder = finalized.order || order;
            return NextResponse.json(buildOrderReadyJson(paidOrder, status, { awaitingPayment: false }));
          }
        }
        return NextResponse.json(buildOrderReadyJson(order, status, { awaitingPayment: true }));
      }

      if (order.payment_status === 'paid' || order.payment_status === null) {
        return NextResponse.json(buildOrderReadyJson(order, status));
      }
    }

    if (status === 'succeeded') {
      try {
        const finalized = await ensureOrderForPaymentIntent(stripe, piId, {
          ip: 'checkout-payment-status',
          userAgent: 'next-server',
          requestId: `poll-${piId}`
        });
        if (finalized.status === 'updated' || finalized.status === 'created' || finalized.status === 'exists') {
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

      return NextResponse.json({
        paid: true,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: true,
        message: 'Pago recibido. Registrando tu pedido…'
      });
    }

    if (status === 'processing') {
      order = await findOrderByPaymentIntentId(piId);
      if (order?.payment_status === 'awaiting_oxxo') {
        return NextResponse.json(buildOrderReadyJson(order, status, { awaitingPayment: true }));
      }
      return NextResponse.json({
        paid: false,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: true,
        message:
          'Tu pago en OXXO está en proceso. Te avisaremos cuando se confirme (puede tardar hasta el siguiente día hábil).'
      });
    }

    if (status === 'requires_action') {
      return NextResponse.json({
        paid: false,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: false,
        needs_oxxo_register: true,
        message: 'Genera tu ficha de pago OXXO para completar el pedido.'
      });
    }

    if (status === 'canceled') {
      return NextResponse.json({
        paid: false,
        order_ready: false,
        payment_intent_status: status,
        keep_polling: false,
        fatal: true,
        message: 'El pago fue cancelado. Si tenías una ficha OXXO, ya no es válida.'
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
