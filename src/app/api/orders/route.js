import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth';
import { getOrdersByUserId } from '../../../lib/firebaseOrders';
import { getRequestMeta, jsonError } from '../../../lib/security';
import { checkRateLimit } from '../../../lib/rateLimit';
import { createOrderFromPayload } from '../../../lib/orderCreation';

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

    const { skip_email } = body;

    const { createdOrder, customerEmailSent } = await createOrderFromPayload({
      body,
      authUser,
      requestMeta,
      options: { skipEmail: Boolean(skip_email) }
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
    const code = error?.code;

    if (code === 'REQUIRED_FIELDS_MISSING') {
      return jsonError(
        'Customer email and at least one item are required',
        400,
        'REQUIRED_FIELDS_MISSING'
      );
    }
    if (code === 'EMPTY_ORDER') {
      return jsonError('No valid items in the order', 400, 'EMPTY_ORDER');
    }

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
