import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';
import { createOrderFromPayload } from '../../../../lib/orderCreation';
import { getRequestMeta, jsonError, normalizeEmail } from '../../../../lib/security';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { getStripe, isStripeConfigured } from '../../../../lib/stripeServer';
import { PENDING_STRIPE_CHECKOUTS_COLLECTION } from '../../../../lib/pendingStripeCheckout';
import {
  extractOxxoDetailsFromPaymentIntent,
  findOrderByPaymentIntentId,
  isOxxoEligibleTotal
} from '../../../../lib/oxxoOrders';

export const runtime = 'nodejs';

function buildOxxoResponse(order) {
  return {
    order_id: order.id,
    order_number: order.order_number,
    total_amount: order.total_amount,
    payment_status: order.payment_status,
    oxxo_hosted_voucher_url: order.oxxo_hosted_voucher_url || null,
    oxxo_reference_number: order.oxxo_reference_number || null,
    oxxo_expires_at: order.oxxo_expires_at || null
  };
}

/**
 * POST /api/checkout/oxxo-register
 * Creates pending OXXO order with stock reserved after voucher is generated.
 */
export async function POST(request) {
  try {
    if (!isStripeConfigured()) {
      return jsonError('Stripe no está configurado', 503, 'STRIPE_NOT_CONFIGURED');
    }

    const requestMeta = getRequestMeta(request);
    const authUser = await authenticateUser(request);

    const rateLimitResult = checkRateLimit({
      routeKey: 'checkout:oxxo-register',
      ip: requestMeta.ip,
      userId: authUser?.id || null,
      limit: 12,
      windowMs: 60 * 1000
    });

    if (!rateLimitResult.allowed) {
      return jsonError('Too many requests. Try again later.', 429, 'RATE_LIMITED', {
        retry_after_ms: rateLimitResult.retryAfterMs
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError('Invalid JSON body', 400, 'INVALID_BODY');
    }

    const paymentIntentId = body?.payment_intent_id || body?.payment_intent;
    if (!paymentIntentId || !String(paymentIntentId).startsWith('pi_')) {
      return jsonError('payment_intent_id inválido', 400, 'INVALID_PAYMENT_INTENT');
    }

    const existingOrder = await findOrderByPaymentIntentId(String(paymentIntentId));
    if (existingOrder) {
      return NextResponse.json(buildOxxoResponse({ id: existingOrder.id, ...existingOrder }));
    }

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(String(paymentIntentId));

    const oxxoDetails = extractOxxoDetailsFromPaymentIntent(pi);
    const isOxxoFlow =
      pi.status === 'requires_action' &&
      pi.next_action?.type === 'oxxo_display_details' &&
      oxxoDetails?.oxxo_hosted_voucher_url;

    if (!isOxxoFlow && pi.status !== 'processing') {
      return jsonError(
        'Este pago no tiene un voucher OXXO activo. Estado: ' + pi.status,
        400,
        'NOT_OXXO_VOUCHER'
      );
    }

    const pendingId = pi.metadata?.pending_checkout_id;
    if (!pendingId) {
      return jsonError('Checkout pendiente no encontrado', 400, 'PENDING_MISSING');
    }

    const pendingDoc = await db.collection(PENDING_STRIPE_CHECKOUTS_COLLECTION).doc(pendingId).get();
    if (!pendingDoc.exists) {
      return jsonError('Sesión de checkout expirada', 400, 'PENDING_EXPIRED');
    }

    const pending = pendingDoc.data();
    const expectedTotal = pending.expected_total_amount;

    if (!isOxxoEligibleTotal(expectedTotal)) {
      return jsonError(
        'El monto del pedido no es elegible para OXXO ($10–$10,000 MXN).',
        400,
        'OXXO_AMOUNT_NOT_ELIGIBLE'
      );
    }

    const orderBody = {
      ...pending.order_body,
      user_id: pending.auth_user_id || pending.order_body?.user_id || null,
      payment_method: 'Stripe (OXXO)',
      payment_status: 'awaiting_oxxo',
      stripe_payment_method_type: 'oxxo',
      ...oxxoDetails
    };

    const authUserForOrder = pending.auth_user_id ? { id: pending.auth_user_id } : authUser;

    const { orderRef, createdOrder } = await createOrderFromPayload({
      body: orderBody,
      authUser: authUserForOrder,
      requestMeta,
      options: {
        skipEmail: true,
        stripePaymentIntentId: String(paymentIntentId),
        prePricedOrderItems: pending.priced_order_items ?? null,
        prePricedServiceItems: pending.priced_service_items ?? null
      }
    });

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      '';
    const voucherPath = `/checkout/oxxo?payment_intent=${encodeURIComponent(paymentIntentId)}`;
    const voucherUrl = siteUrl ? `${siteUrl.replace(/\/$/, '')}${voucherPath}` : voucherPath;

    if (createdOrder.customer_email) {
      try {
        const { sendOxxoPendingOrderEmail } = await import('../../../../lib/emailService');
        await sendOxxoPendingOrderEmail({
          customer_email: createdOrder.customer_email,
          customer_name: createdOrder.customer_name,
          order_number: createdOrder.order_number,
          total_amount: createdOrder.total_amount,
          voucher_url: voucherUrl,
          oxxo_hosted_voucher_url: createdOrder.oxxo_hosted_voucher_url,
          oxxo_reference_number: createdOrder.oxxo_reference_number,
          oxxo_expires_at: createdOrder.oxxo_expires_at
        });
      } catch (emailErr) {
        console.error('OXXO pending email failed:', emailErr);
      }
    }

    return NextResponse.json(
      buildOxxoResponse({
        id: orderRef.id,
        ...createdOrder
      })
    );
  } catch (error) {
    console.error('oxxo-register error:', error);
    if (error?.code === 'INSUFFICIENT_STOCK' || error?.code === 'PRODUCT_NOT_FOUND') {
      return jsonError(error.message, 400, error.code);
    }
    return jsonError(error?.message || 'No se pudo registrar el pago OXXO', 500, 'OXXO_REGISTER_ERROR');
  }
}
