import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { validateCoupon } from '../../../../lib/firebaseCoupons';
import { db } from '../../../../lib/firebaseAdmin';
import {
  buildPricedOrderItems,
  buildPricedServiceItems,
  computeSubtotal,
  computeOrderTotals
} from '../../../../lib/orderPricing';
import { getRequestMeta, jsonError, normalizeEmail } from '../../../../lib/security';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { getStripe, isStripeConfigured } from '../../../../lib/stripeServer';
import {
  PENDING_STRIPE_CHECKOUTS_COLLECTION,
  PENDING_STRIPE_CHECKOUT_TTL_MS
} from '../../../../lib/pendingStripeCheckout';
import { assertStockAvailableForOrderItems } from '../../../../lib/orderStock';

/**
 * POST /api/checkout/payment-intent
 * Creates a PaymentIntent + Firestore pending doc for embedded Payment Element (no redirect to Stripe Checkout).
 */
export async function POST(request) {
  try {
    if (!isStripeConfigured()) {
      return jsonError('Stripe no está configurado en el servidor', 503, 'STRIPE_NOT_CONFIGURED');
    }

    const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
    if (!publishable) {
      return jsonError('Falta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 503, 'STRIPE_PUBLISHABLE_MISSING');
    }

    const requestMeta = getRequestMeta(request);
    const authUser = await authenticateUser(request);

    const rateLimitResult = checkRateLimit({
      routeKey: 'checkout:payment-intent',
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
    if (!body || typeof body !== 'object') {
      return jsonError('Request body is required', 400, 'BODY_REQUIRED');
    }

    const {
      user_id,
      items,
      service_items,
      shipping_address_id,
      billing_address_id,
      notes,
      customer_email,
      customer_phone,
      customer_name,
      shipping_method,
      address,
      pickup_point,
      coupon_code,
      cancel_previous_payment_intent_id
    } = body;

    const normalizedCustomerEmail = normalizeEmail(customer_email || authUser?.email);

    if (!normalizedCustomerEmail || (!items?.length && !service_items?.length)) {
      return jsonError(
        'Customer email and at least one item are required',
        400,
        'REQUIRED_FIELDS_MISSING'
      );
    }

    const authUserId = authUser?.id || null;
    const trustedUserId = authUserId || user_id || null;

    const orderItems = await buildPricedOrderItems(items || []);
    const orderServiceItems = await buildPricedServiceItems(service_items || []);
    const subtotal = computeSubtotal(orderItems, orderServiceItems);

    if (subtotal <= 0) {
      return jsonError('No valid items in the order', 400, 'EMPTY_ORDER');
    }

    let discountAmount = 0;
    if (coupon_code && String(coupon_code).trim()) {
      const couponEval = await validateCoupon({
        code: String(coupon_code).trim(),
        userId: trustedUserId || null,
        customerEmail: normalizedCustomerEmail,
        items: orderItems,
        orderSubtotal: subtotal
      });
      if (!couponEval) {
        return jsonError('Cupón inválido o no aplicable', 400, 'COUPON_INVALID');
      }
      discountAmount = couponEval.discount_amount || 0;
    }

    const totals = computeOrderTotals({
      subtotal,
      shippingMethod: shipping_method || null,
      discountAmount
    });

    try {
      await assertStockAvailableForOrderItems(orderItems);
    } catch (stockErr) {
      if (stockErr?.code === 'INSUFFICIENT_STOCK' || stockErr?.code === 'PRODUCT_NOT_FOUND') {
        return jsonError(
          stockErr.message || 'No hay stock suficiente para uno o más productos.',
          400,
          stockErr.code || 'INSUFFICIENT_STOCK'
        );
      }
      throw stockErr;
    }

    const expectedAmountCents = Math.round(totals.total_amount * 100);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PENDING_STRIPE_CHECKOUT_TTL_MS);

    const orderBody = {
      user_id: trustedUserId,
      items: items || [],
      service_items: service_items || [],
      shipping_address_id: shipping_address_id || null,
      billing_address_id: billing_address_id || null,
      notes: notes || null,
      customer_email: normalizedCustomerEmail,
      customer_phone: customer_phone || null,
      customer_name: customer_name || null,
      payment_method: 'Stripe',
      shipping_method: shipping_method || null,
      address: address || null,
      pickup_point: pickup_point || null,
      coupon_code: coupon_code && String(coupon_code).trim() ? String(coupon_code).trim() : null
    };

    const pendingRef = db.collection(PENDING_STRIPE_CHECKOUTS_COLLECTION).doc();

    const pendingPayload = {
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      order_body: orderBody,
      auth_user_id: authUserId,
      expected_amount_cents: expectedAmountCents,
      expected_total_amount: totals.total_amount,
      expected_subtotal: totals.subtotal,
      expected_shipping_amount: totals.shipping_amount,
      expected_discount_amount: totals.discount_amount,
      stripe_payment_intent_id: null,
      stripe_checkout_session_id: null,
      status: 'pending'
    };

    await pendingRef.set(pendingPayload);

    const stripe = getStripe();

    if (cancel_previous_payment_intent_id && String(cancel_previous_payment_intent_id).startsWith('pi_')) {
      try {
        await stripe.paymentIntents.cancel(String(cancel_previous_payment_intent_id));
      } catch (cancelErr) {
        console.warn('Could not cancel previous PaymentIntent:', cancelErr.message);
      }
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: expectedAmountCents,
        currency: 'mxn',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always'
        },
        receipt_email: normalizedCustomerEmail,
        metadata: {
          pending_checkout_id: pendingRef.id
        },
        description: 'Pedido Dingerbites'
      });

      await pendingRef.update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        pending_checkout_id: pendingRef.id,
        publishableKey: publishable
      });
    } catch (stripeErr) {
      console.error('Stripe paymentIntents.create failed:', stripeErr);
      await pendingRef.delete().catch(() => {});
      return jsonError(
        'No se pudo iniciar el pago con tarjeta. Intenta de nuevo.',
        502,
        'STRIPE_PI_FAILED'
      );
    }
  } catch (error) {
    console.error('payment-intent error:', error);
    return jsonError(
      error?.message || 'Error al crear el intento de pago',
      500,
      'PAYMENT_INTENT_ERROR'
    );
  }
}
