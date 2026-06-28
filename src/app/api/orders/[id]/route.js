import { NextResponse } from 'next/server';
import {
  getOrderById,
  updateOrderStatus,
  updateOrderShippingInfo,
  updateOrderNotes,
  updateOrderDeliverySchedule,
  cancelOrder,
  getOrderStatusById
} from '../../../../lib/firebaseOrders';
import { authenticateUser, isAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

function canAccessOrder(user, order) {
  if (!user || !order) return false;
  if (isAdmin(user)) return true;
  return String(order.user_id || '') === String(user.id || '');
}

// GET /api/orders/[id] - Get order by ID with details
export async function GET(request, { params }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    if (!canAccessOrder(user, order)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      order,
      items: order.items,
      serviceItems: order.serviceItems,
      history: order.history
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Update order status
export async function PUT(request, { params }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      status_id,
      notes,
      order_notes,
      tracking_id,
      carrier_company,
      tracking_url,
      scheduled_delivery_date,
      scheduled_delivery_time
    } = body || {};

    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const isStatusChange =
      status_id && String(status_id) !== String(existingOrder.status_id || '');

    if (isStatusChange) {
      const statusExists = await getOrderStatusById(status_id);
      if (!statusExists) {
        return NextResponse.json(
          { error: 'Status not found' },
          { status: 404 }
        );
      }
    }

    const shippingInfo = {};
    if (tracking_id !== undefined) shippingInfo.tracking_id = tracking_id == null ? null : String(tracking_id).trim() || null;
    if (carrier_company !== undefined) shippingInfo.carrier_company = carrier_company == null ? null : String(carrier_company).trim() || null;
    if (tracking_url !== undefined) shippingInfo.tracking_url = tracking_url == null ? null : String(tracking_url).trim() || null;

    let updated = existingOrder;

    if (order_notes !== undefined) {
      const notesResult = await updateOrderNotes(id, order_notes);
      if (!notesResult) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      updated = notesResult;
    }

    if (scheduled_delivery_date !== undefined || scheduled_delivery_time !== undefined) {
      const scheduleResult = await updateOrderDeliverySchedule(id, {
        scheduled_delivery_date: scheduled_delivery_date || null,
        scheduled_delivery_time: scheduled_delivery_time || null
      });
      if (!scheduleResult) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      updated = scheduleResult;
    }

    const hasShippingFields = Object.keys(shippingInfo).length > 0;
    const isShippingOnlyUpdate = hasShippingFields && !isStatusChange && notes === undefined;

    if (isShippingOnlyUpdate) {
      const shippingResult = await updateOrderShippingInfo(id, shippingInfo);
      if (!shippingResult) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      updated = shippingResult;
    } else if (isStatusChange || notes !== undefined || hasShippingFields) {
      const statusResult = await updateOrderStatus(
        id,
        status_id || existingOrder.status_id,
        notes,
        hasShippingFields ? shippingInfo : undefined
      );
      if (!statusResult) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      updated = statusResult;
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Cancel order
export async function DELETE(request, { params }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    const cancelledOrder = await cancelOrder(id);
    return NextResponse.json({
      message: 'Order cancelled successfully',
      order: cancelledOrder
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
