import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { listOrdersAdmin } from '../../../../lib/firebaseOrders';

// GET /api/admin/orders - Get orders with admin features (admin only)
export async function GET(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const result = await listOrdersAdmin({
      page,
      limit,
      search,
      status,
      dateFrom,
      dateTo
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
