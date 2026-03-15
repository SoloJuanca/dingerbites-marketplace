import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { listNotificationsForUser, markNotificationsAsRead } from '../../../../lib/firebaseNotifications';

// GET /api/users/notifications - list authenticated user notifications
export async function GET(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await listNotificationsForUser(user.id, { page, limit, unreadOnly });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH /api/users/notifications - mark notifications as read
export async function PATCH(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationIds = Array.isArray(body?.notificationIds) ? body.notificationIds : [];
    const updatedCount = await markNotificationsAsRead(user.id, notificationIds);

    return NextResponse.json({
      success: true,
      updatedCount
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
