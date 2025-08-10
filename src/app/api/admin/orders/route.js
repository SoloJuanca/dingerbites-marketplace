import { NextResponse } from 'next/server';
import { getRows, getRow, query } from '../../../../lib/database';
import { authenticateAdmin } from '../../../../lib/auth';

// GET /api/admin/orders - Get orders with admin features (admin only)
export async function GET(request) {
  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Build WHERE clause for filters
    let whereClause = '';
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += `WHERE (o.order_number ILIKE $${paramIndex} OR o.customer_email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      const operator = whereClause ? 'AND' : 'WHERE';
      whereClause += `${operator} os.name = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      const operator = whereClause ? 'AND' : 'WHERE';
      whereClause += `${operator} o.created_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      const operator = whereClause ? 'AND' : 'WHERE';
      whereClause += `${operator} o.created_at <= $${paramIndex}`;
      params.push(dateTo + ' 23:59:59');
      paramIndex++;
    }

    const ordersQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.customer_email,
        o.customer_phone,
        o.total_amount,
        o.subtotal,
        o.tax_amount,
        o.shipping_amount,
        o.discount_amount,
        o.payment_method,
        o.payment_status,
        o.shipping_method,
        o.tracking_number,
        o.estimated_delivery_date,
        o.actual_delivery_date,
        o.notes,
        o.created_at,
        o.updated_at,
        os.id as status_id,
        os.name as status_name,
        os.color as status_color,
        u.id as user_id,
        u.first_name,
        u.last_name,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name
      FROM orders o
      LEFT JOIN order_statuses os ON o.status_id = os.id
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const orders = await getRows(ordersQuery, params);

    // Get total count with same filters
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o
      LEFT JOIN order_statuses os ON o.status_id = os.id
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const totalResult = await getRow(countQuery, countParams);
    const total = parseInt(totalResult.total);

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN os.name = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN os.name = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM orders o
      LEFT JOIN order_statuses os ON o.status_id = os.id
    `;
    const stats = await getRow(statsQuery);

    return NextResponse.json({
      orders,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
