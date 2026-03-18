import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth';
import { getOrdersByUserId, getOrderStatusIdByName } from '../../../lib/firebaseOrders';
import { getUserByEmail, createUser } from '../../../lib/firebaseUsers';
import { consumeCouponInTransaction } from '../../../lib/firebaseCoupons';
import { hashPassword } from '../../../lib/auth';
import { sendOrderNotifications } from '../../../lib/emailService';
import { db } from '../../../lib/firebaseAdmin';
import { randomUUID } from 'crypto';
import {
  buildPricedOrderItems,
  buildPricedServiceItems,
  computeSubtotal,
  computeOrderTotals
} from '../../../lib/orderPricing';
import { getRequestMeta, jsonError, normalizeEmail } from '../../../lib/security';
import { checkRateLimit } from '../../../lib/rateLimit';
import { logSecurityEvent } from '../../../lib/auditLog';

// GET /api/orders - Get orders (user-specific, requires authentication)
export async function GET(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    const result = await getOrdersByUserId(user.id, { status, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    const message = process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch orders';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order
export async function POST(request) {
  try {
    const requestMeta = getRequestMeta(request);
    const authUser = await authenticateUser(request);

    const rateLimitResult = checkRateLimit({
      routeKey: 'orders:create',
      ip: requestMeta.ip,
      userId: authUser?.id || null,
      limit: 8,
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
    } catch (parseError) {
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
      payment_method,
      shipping_method,
      skip_email,
      address,
      pickup_point,
      coupon_code
    } = body;
    const normalizedCustomerEmail = normalizeEmail(customer_email || authUser?.email);

    if (!normalizedCustomerEmail || (!items?.length && !service_items?.length)) {
      return jsonError(
        'Customer email and at least one item are required',
        400,
        'REQUIRED_FIELDS_MISSING'
      );
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    let pendingStatusId = await getOrderStatusIdByName('pending');
    if (!pendingStatusId) {
      // Auto-create default "pending" status if collection is empty (first run)
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
      return jsonError('No valid items in the order', 400, 'EMPTY_ORDER');
    }

    const orderRef = db.collection('orders').doc();
    const reviewToken = randomUUID();
    const now = new Date().toISOString();

    const createdOrder = await db.runTransaction(async (transaction) => {
      let couponApplication = null;
      if (coupon_code && String(coupon_code).trim()) {
        couponApplication = await consumeCouponInTransaction({
          transaction,
          code: String(coupon_code).trim(),
          userId: finalUserId || null,
          customerEmail: normalizedCustomerEmail,
          items: orderItems,
          orderSubtotal: subtotal,
          orderId: orderRef.id,
          requestMeta
        });
      }

      const totals = computeOrderTotals({
        subtotal,
        shippingMethod: shipping_method || null,
        discountAmount: couponApplication?.discount_amount || 0
      });

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
        payment_method: payment_method || null,
        shipping_method: shipping_method || null,
        pickup_point: pickup_point || null,
        items: orderItems,
        service_items: orderServiceItems,
        coupon_id: couponApplication?.coupon_id || null,
        coupon_code: couponApplication?.coupon_code || null,
        review_token: reviewToken,
        review_token_used_at: null,
        history: [
          {
            status_id: pendingStatusId,
            notes: 'Order created',
            created_at: now
          }
        ],
        created_at: now,
        updated_at: now
      };

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
    if (!skip_email) {
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
        total_amount: createdOrder.total_amount
      }
    });

    return NextResponse.json(
      {
        id: createdOrder.id,
        order_number: createdOrder.order_number,
        subtotal: createdOrder.subtotal,
        shipping_amount: createdOrder.shipping_amount,
        discount_amount: createdOrder.discount_amount,
        total_amount: createdOrder.total_amount,
        coupon_id: createdOrder.coupon_id,
        coupon_code: createdOrder.coupon_code,
        email_sent: customerEmailSent
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    const message = error?.message || 'Failed to create order';
    const isKnownValidation =
      message.includes('not found') ||
      message.includes('Coupon rejected') ||
      message.includes('requires');

    return jsonError(
      isKnownValidation ? message : 'Failed to create order',
      isKnownValidation ? 400 : 500,
      'ORDER_CREATE_FAILED'
    );
  }
}
