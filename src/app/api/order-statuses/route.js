import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebaseAdmin';

// GET /api/order-statuses - Get all order statuses
export async function GET(request) {
  try {
    const snapshot = await db.collection('order_statuses').get();
    let statuses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    statuses.sort((a, b) => {
      const sortA = Number(a.sort_order || 0);
      const sortB = Number(b.sort_order || 0);
      if (sortA !== sortB) return sortA - sortB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    if (statuses.length === 0) {
      statuses = [
        { id: 'pending', name: 'pending', description: 'Pending', color: '#f59e0b', sort_order: 0 },
        { id: 'confirmed', name: 'confirmed', description: 'Confirmed', color: '#3b82f6', sort_order: 1 },
        { id: 'processing', name: 'processing', description: 'Processing', color: '#8b5cf6', sort_order: 2 },
        { id: 'shipped', name: 'shipped', description: 'Shipped', color: '#06b6d4', sort_order: 3 },
        { id: 'delivered', name: 'delivered', description: 'Delivered', color: '#22c55e', sort_order: 4 },
        { id: 'cancelled', name: 'cancelled', description: 'Cancelled', color: '#ef4444', sort_order: 5 }
      ];
    }

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
