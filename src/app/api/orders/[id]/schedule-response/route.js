import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../../lib/auth';
import { getOrderById, updateOrderScheduleResponse } from '../../../../../lib/firebaseOrders';

/**
 * GET /api/orders/[id]/schedule-response?token=xxx
 * Fetch schedule info for confirmar-horario page. Requires valid token or auth + ownership.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let canView = false;
    if (token && order.schedule_token === token) {
      canView = true;
    } else {
      const user = await authenticateUser(request);
      if (user && order.user_id && String(order.user_id) === String(user.id)) {
        canView = true;
      }
    }

    if (!canView) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({
      order_number: order.order_number,
      scheduled_delivery_date: order.scheduled_delivery_date,
      scheduled_delivery_time: order.scheduled_delivery_time,
      delivery_schedule_status: order.delivery_schedule_status
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Error al cargar' }, { status: 500 });
  }
}

/**
 * POST /api/orders/[id]/schedule-response
 * User accepts or rejects the proposed delivery schedule.
 * Body: { delivery_schedule_status: 'accepted' | 'rejected', token?: string }
 * - If token is provided (from email link), no auth required.
 * - If no token, user must be authenticated and own the order.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { delivery_schedule_status, token } = body || {};

    if (!delivery_schedule_status || !['accepted', 'rejected'].includes(delivery_schedule_status)) {
      return NextResponse.json(
        { error: 'delivery_schedule_status must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.delivery_schedule_status === 'accepted' || order.delivery_schedule_status === 'rejected') {
      return NextResponse.json(
        { error: 'El horario ya fue respondido' },
        { status: 400 }
      );
    }

    let canRespond = false;
    if (token) {
      canRespond = order.schedule_token === token;
    } else {
      const user = await authenticateUser(request);
      if (user && order.user_id && String(order.user_id) === String(user.id)) {
        canRespond = true;
      }
    }

    if (!canRespond) {
      return NextResponse.json(
        { error: 'No autorizado para responder a este horario' },
        { status: 403 }
      );
    }

    const updated = await updateOrderScheduleResponse(id, delivery_schedule_status, token || null);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating schedule response:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la respuesta' },
      { status: 500 }
    );
  }
}
