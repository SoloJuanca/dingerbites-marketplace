import { NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus, cancelOrder, getOrderStatusById } from '../../../lib/firebaseOrders';

// GET /api/orders/[id] - Get order by ID with details
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
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
    const { id } = params;
    const body = await request.json();
    const { status_id, notes } = body;

    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (status_id) {
      const statusExists = await getOrderStatusById(status_id);
      if (!statusExists) {
        return NextResponse.json(
          { error: 'Status not found' },
          { status: 404 }
        );
      }
    }

    const updated = await updateOrderStatus(id, status_id || existingOrder.status_id, notes);
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
    const { id } = params;
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
