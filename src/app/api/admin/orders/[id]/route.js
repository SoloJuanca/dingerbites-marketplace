import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { getOrderById, updateOrderStatus, getOrderStatusById } from '../../../../../lib/firebaseOrders';
import { cancelAwaitingOxxoOrder } from '../../../../../lib/oxxoOrders';

export async function PUT(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status_id } = body || {};

    if (!status_id) {
      return NextResponse.json({ error: 'status_id is required' }, { status: 400 });
    }

    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const targetStatus = await getOrderStatusById(status_id);
    if (
      targetStatus?.name === 'cancelled' &&
      existingOrder.payment_status === 'awaiting_oxxo'
    ) {
      await cancelAwaitingOxxoOrder(id, { cancelStripePi: true });
      const refreshed = await getOrderById(id);
      return NextResponse.json(refreshed);
    }

    const updated = await updateOrderStatus(id, status_id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
