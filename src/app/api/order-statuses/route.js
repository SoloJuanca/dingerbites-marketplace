import { NextResponse } from 'next/server';
import { getRows } from '../../../lib/database';

// GET /api/order-statuses - Get all order statuses
export async function GET(request) {
  try {
    const statusesQuery = `
      SELECT id, name, description, color
      FROM order_statuses
      ORDER BY sort_order ASC, name ASC
    `;

    const statuses = await getRows(statusesQuery);

    return NextResponse.json({
      statuses
    });

  } catch (error) {
    console.error('Error fetching order statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order statuses' },
      { status: 500 }
    );
  }
}
