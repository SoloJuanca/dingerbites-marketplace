import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { getRow, query } from '../../../../lib/database';

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(request) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    // Get basic stats from the admin_dashboard_stats view
    const stats = await getRow('SELECT * FROM admin_dashboard_stats');

    // Get revenue trends for the last 30 days
    const revenueTrends = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get top selling products (last 30 days)
    const topProducts = await query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price,
        p.stock_quantity,
        COALESCE(pi.image_url, '') as image_url,
        pc.name as category_name,
        pb.name as brand_name,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as total_revenue
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.slug, p.price, p.stock_quantity, pi.image_url, pc.name, pb.name
      HAVING COALESCE(SUM(oi.quantity), 0) > 0
      ORDER BY total_sold DESC, total_revenue DESC
      LIMIT 10
    `);

    // Get sales by location (last 30 days)
    const salesByLocation = await query(`
      SELECT 
        COALESCE(ua.city, 'Sin especificar') as city,
        COALESCE(ua.state, 'Sin especificar') as state,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM orders o
      LEFT JOIN user_addresses ua ON o.billing_address_id = ua.id
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY ua.city, ua.state
      HAVING COUNT(o.id) > 0
      ORDER BY total_revenue DESC, order_count DESC
      LIMIT 10
    `);

    // Get stock alerts
    const stockAlerts = await query(`
      SELECT 
        sa.*,
        p.name as product_name,
        p.slug as product_slug,
        p.sku,
        p.price,
        COALESCE(pi.image_url, '') as image_url
      FROM stock_alerts sa
      LEFT JOIN products p ON sa.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE sa.is_resolved = false
      ORDER BY sa.created_at DESC
      LIMIT 20
    `);

    // Get recent orders
    const recentOrders = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.created_at,
        os.name as status_name,
        os.color as status_color,
        COALESCE(u.first_name || ' ' || u.last_name, 'Guest') as customer_name,
        o.customer_email,
        o.customer_phone,
        (
          SELECT COUNT(*) 
          FROM order_items oi 
          WHERE oi.order_id = o.id
        ) + (
          SELECT COUNT(*) 
          FROM order_service_items osi 
          WHERE osi.order_id = o.id
        ) as item_count
      FROM orders o
      LEFT JOIN order_statuses os ON o.status_id = os.id
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Get monthly revenue comparison
    const monthlyRevenue = await query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    // Get order status distribution
    const orderStatusDistribution = await query(`
      SELECT 
        os.name,
        os.color,
        COUNT(o.id) as count
      FROM order_statuses os
      LEFT JOIN orders o ON os.id = o.status_id AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY os.id, os.name, os.color, os.sort_order
      ORDER BY os.sort_order
    `);

    return NextResponse.json({
      success: true,
      data: {
        stats: stats || {
          orders_today: 0,
          orders_week: 0,
          orders_month: 0,
          revenue_today: 0,
          revenue_week: 0,
          revenue_month: 0,
          new_users_today: 0,
          new_users_week: 0,
          new_users_month: 0,
          low_stock_products: 0,
          out_of_stock_products: 0
        },
        revenueTrends,
        topProducts,
        salesByLocation,
        stockAlerts,
        recentOrders,
        monthlyRevenue,
        orderStatusDistribution
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
