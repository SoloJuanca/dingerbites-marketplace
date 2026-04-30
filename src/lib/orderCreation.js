import {
  applyPreparedCouponConsumptionInTransaction,
  prepareCouponConsumptionInTransaction
} from './firebaseCoupons';
import { getOrderStatusIdByName } from './firebaseOrders';
import { getUserByEmail, createUser } from './firebaseUsers';
import { hashPassword } from './auth';
import { sendOrderNotifications } from './emailService';
import { db } from './firebaseAdmin';
import { randomUUID } from 'crypto';
import {
  buildPricedOrderItems,
  buildPricedServiceItems,
  computeSubtotal,
  computeOrderTotals
} from './orderPricing';
import { normalizeEmail } from './security';
import { logSecurityEvent } from './auditLog';
import { deductProductStockInTransaction } from './orderStock';

/**
 * Create order in Firestore with the same rules as POST /api/orders.
 *
 * @param {object} params
 * @param {object} params.body - Request body (same shape as POST /api/orders)
 * @param {object|null} params.authUser - Authenticated user or null
 * @param {object} params.requestMeta - From getRequestMeta()
 * @param {object} [params.options]
 * @param {boolean} [params.options.skipEmail]
 * @param {string|null} [params.options.stripeCheckoutSessionId]
 * @param {string|null} [params.options.stripePaymentIntentId]
 * @returns {Promise<object>}
 */
export async function createOrderFromPayload({ body, authUser, requestMeta, options = {} }) {
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
    payment_method,
    shipping_method,
    address,
    pickup_point,
    coupon_code,
    order_origin,
    pos_in_person
  } = body;

  const skipEmail = options.skipEmail === true;
  const stripeCheckoutSessionId = options.stripeCheckoutSessionId || null;
  const stripePaymentIntentId = options.stripePaymentIntentId || null;

  const isPosOrder = order_origin === 'pos' || pos_in_person === true;
  const normalizedCustomerEmail = normalizeEmail(
    customer_email || (isPosOrder ? 'pos@dingerbites.com' : authUser?.email)
  );

  if (!normalizedCustomerEmail || (!items?.length && !service_items?.length)) {
    const err = new Error('Customer email and at least one item are required');
    err.code = 'REQUIRED_FIELDS_MISSING';
    throw err;
  }

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  let pendingStatusId = await getOrderStatusIdByName('pending');
  if (!pendingStatusId) {
    const statusRef = db.collection('order_statuses').doc();
    await statusRef.set({
      name: 'pending',
      description: 'Pending',
      color: '#f59e0b',
      sort_order: 0
    });
    pendingStatusId = statusRef.id;
  }

  let finalUserId = authUser?.id || user_id || null;
  let finalShippingAddressId = shipping_address_id;

  if (!finalUserId && normalizedCustomerEmail) {
    let existingUser = await getUserByEmail(normalizedCustomerEmail);
    if (!existingUser) {
      const nameParts = customer_name ? customer_name.split(' ') : ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const guestPassword = await hashPassword(
        `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      );
      const newUser = await createUser({
        email: normalizedCustomerEmail,
        password_hash: guestPassword,
        first_name: firstName,
        last_name: lastName,
        phone: customer_phone || null,
        is_guest: true
      });
      finalUserId = newUser.id;

      if (address && shipping_method === 'Envío a domicilio') {
        const now = new Date().toISOString();
        const addressRef = db.collection('user_addresses').doc();
        await addressRef.set({
          user_id: finalUserId,
          address_type: 'shipping',
          is_default: true,
          first_name: firstName,
          last_name: lastName,
          address_line_1: address,
          city: 'Ciudad',
          state: 'Estado',
          postal_code: '00000',
          country: 'Mexico',
          phone: customer_phone || null,
          created_at: now,
          updated_at: now
        });
        finalShippingAddressId = addressRef.id;
      }
    } else {
      finalUserId = existingUser.id;
    }
  }

  const orderItems = await buildPricedOrderItems(items || []);
  const orderServiceItems = await buildPricedServiceItems(service_items || []);
  const subtotal = computeSubtotal(orderItems, orderServiceItems);

  if (subtotal <= 0) {
    const err = new Error('No valid items in the order');
    err.code = 'EMPTY_ORDER';
    throw err;
  }

  const orderRef = db.collection('orders').doc();
  const reviewToken = randomUUID();
  const now = new Date().toISOString();

  const createdOrder = await db.runTransaction(async (transaction) => {
    let couponPrepared = null;
    let couponApplication = null;
    if (coupon_code && String(coupon_code).trim()) {
      couponPrepared = await prepareCouponConsumptionInTransaction({
        transaction,
        code: String(coupon_code).trim(),
        userId: finalUserId || null,
        customerEmail: normalizedCustomerEmail,
        items: orderItems,
        orderSubtotal: subtotal,
        orderId: orderRef.id,
        requestMeta
      });
      couponApplication = couponPrepared.application;
    }

    const totals = computeOrderTotals({
      subtotal,
      shippingMethod: shipping_method || null,
      discountAmount: couponApplication?.discount_amount || 0
    });

    await deductProductStockInTransaction(transaction, orderItems, now);

    // After stock reads, we can safely apply transactional coupon writes (no more reads after this point).
    if (couponPrepared) {
      applyPreparedCouponConsumptionInTransaction(transaction, couponPrepared);
    }

    const orderPayload = {
      id: orderRef.id,
      order_number: orderNumber,
      user_id: finalUserId || null,
      status_id: pendingStatusId,
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      shipping_amount: totals.shipping_amount,
      discount_amount: totals.discount_amount,
      total_amount: totals.total_amount,
      shipping_address_id: finalShippingAddressId || null,
      billing_address_id: billing_address_id || null,
      notes: notes || null,
      customer_email: normalizedCustomerEmail,
      customer_phone: customer_phone || null,
      customer_name: customer_name || null,
      payment_method: payment_method || null,
      shipping_method: shipping_method || null,
      pickup_point: pickup_point || null,
      order_origin: order_origin || null,
      pos_in_person: pos_in_person === true,
      items: orderItems,
      service_items: orderServiceItems,
      coupon_id: couponApplication?.coupon_id || null,
      coupon_code: couponApplication?.coupon_code || null,
      review_token: reviewToken,
      review_token_used_at: null,
      history: [
        {
          status_id: pendingStatusId,
          notes:
            order_origin === 'pos' || pos_in_person === true
              ? 'Order created (POS)'
              : 'Order created',
          created_at: now
        }
      ],
      created_at: now,
      updated_at: now
    };

    if (stripeCheckoutSessionId) {
      orderPayload.stripe_checkout_session_id = stripeCheckoutSessionId;
    }
    if (stripePaymentIntentId) {
      orderPayload.stripe_payment_intent_id = stripePaymentIntentId;
    }

    transaction.set(orderRef, orderPayload);
    return orderPayload;
  });

  const orderData = {
    order_number: createdOrder.order_number,
    customer_name,
    customer_email: normalizedCustomerEmail,
    customer_phone,
    total_amount: createdOrder.total_amount,
    payment_method,
    shipping_method,
    items: createdOrder.items || [],
    service_items: createdOrder.service_items || [],
    address,
    pickup_point: pickup_point || null,
    notes,
    created_at: new Date()
  };

  let customerEmailSent = false;
  if (!skipEmail) {
    try {
      const emailResults = await sendOrderNotifications(orderData);
      customerEmailSent = emailResults.customerEmail?.success === true;
      if (!emailResults.adminEmail?.success) {
        console.warn('Order created but admin notification email failed:', emailResults.adminEmail?.error);
      }
      if (orderData.customer_email && !customerEmailSent) {
        console.warn('Order created but customer confirmation email failed:', emailResults.customerEmail?.error);
      }
    } catch (err) {
      console.error('Email notifications error:', err);
    }
  }

  await logSecurityEvent({
    event_type: 'ORDER_CREATED',
    result: 'success',
    actor_user_id: finalUserId || null,
    actor_email: normalizedCustomerEmail,
    target_order_id: orderRef.id,
    target_coupon_id: createdOrder.coupon_id || null,
    ip: requestMeta.ip,
    user_agent: requestMeta.userAgent,
    request_id: requestMeta.requestId,
    details: {
      subtotal: createdOrder.subtotal,
      discount_amount: createdOrder.discount_amount,
      total_amount: createdOrder.total_amount,
      stripe_checkout_session_id: stripeCheckoutSessionId || null,
      stripe_payment_intent_id: stripePaymentIntentId || null
    }
  });

  return {
    orderRef,
    createdOrder,
    customerEmailSent,
    normalizedCustomerEmail,
    finalUserId
  };
}
