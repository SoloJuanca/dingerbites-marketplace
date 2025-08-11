import { NextResponse } from 'next/server';
import { getRow, getRows, query } from '../../../../lib/database';

// GET /api/orders/[id] - Get order by ID with details
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get order details
    const orderQuery = `
      SELECT o.*, os.name as status_name, os.color as status_color,
             u.email as customer_email, u.first_name, u.last_name, u.phone
      FROM orders o
      JOIN order_statuses os ON o.status_id = os.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `;

    const order = await getRow(orderQuery, [id]);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get order items (products)
    const orderItemsQuery = `
      SELECT oi.*, p.name as product_name, p.slug as product_slug,
             pv.name as variant_name, pv.sku as variant_sku
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.product_variant_id = pv.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `;
    console.log("orderItemsQuery", orderItemsQuery);
    const orderItems = await getRows(orderItemsQuery, [id]);
    console.log("orderItems", orderItems);
    // Get order service items
    const orderServiceItemsQuery = `
      SELECT osi.*, s.name as service_name, s.slug as service_slug,
             ss.date, ss.start_time, ss.end_time
      FROM order_service_items osi
      LEFT JOIN services s ON osi.service_id = s.id
      LEFT JOIN service_schedules ss ON osi.service_schedule_id = ss.id
      WHERE osi.order_id = $1
      ORDER BY osi.created_at ASC
    `;

    const orderServiceItems = await getRows(orderServiceItemsQuery, [id]);

    // Get order history
    const orderHistoryQuery = `
      SELECT oh.*, os.name as status_name
      FROM order_history oh
      JOIN order_statuses os ON oh.status_id = os.id
      WHERE oh.order_id = $1
      ORDER BY oh.created_at DESC
    `;

    const orderHistory = await getRows(orderHistoryQuery, [id]);

    return NextResponse.json({
      order,
      items: orderItems,
      serviceItems: orderServiceItems,
      history: orderHistory
    });

  } catch (error) {
    console.error('Error fetching orderdwu:', error);
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

    // Check if order exists
    const existingOrder = await getRow('SELECT id, status_id FROM orders WHERE id = $1', [id]);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if status exists
    if (status_id) {
      const statusExists = await getRow('SELECT id FROM order_statuses WHERE id = $1', [status_id]);
      if (!statusExists) {
        return NextResponse.json(
          { error: 'Status not found' },
          { status: 404 }
        );
      }
    }

    // Update order
    const updateQuery = `
      UPDATE orders 
      SET status_id = COALESCE($2, status_id),
          notes = COALESCE($3, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, status_id, notes, updated_at
    `;

    const updatedOrder = await getRow(updateQuery, [id, status_id, notes]);

    // Add to order history if status changed
    if (status_id && status_id !== existingOrder.status_id) {
      await query(`
        INSERT INTO order_history (order_id, status_id, notes)
        VALUES ($1, $2, $3)
      `, [id, status_id, notes || 'Status updated']);
    }

    return NextResponse.json(updatedOrder);

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

    // Check if order exists
    const existingOrder = await getRow('SELECT id, status_id FROM orders WHERE id = $1', [id]);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get cancelled status
    const cancelledStatus = await getRow(
      'SELECT id FROM order_statuses WHERE name = $1',
      ['cancelled']
    );

    if (!cancelledStatus) {
      return NextResponse.json(
        { error: 'Cancelled status not found' },
        { status: 500 }
      );
    }

    // Update order to cancelled
    const cancelQuery = `
      UPDATE orders 
      SET status_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, order_number
    `;

    const cancelledOrder = await getRow(cancelQuery, [id, cancelledStatus.id]);

    // Add to order history
    await query(`
      INSERT INTO order_history (order_id, status_id, notes)
      VALUES ($1, $2, $3)
    `, [id, cancelledStatus.id, 'Order cancelled']);

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