import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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

    const [ordersSnap, usersSnap, productsSnap, statusesSnap] = await Promise.all([
      db.collection('orders').get().catch(() => ({ docs: [] })),
      db.collection('users').get().catch(() => ({ docs: [] })),
      db.collection('products').get().catch(() => ({ docs: [] })),
      db.collection('order_statuses').get().catch(() => ({ docs: [] }))
    ]);

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);
    const yearStart = new Date(now);
    yearStart.setMonth(now.getMonth() - 12);

    const orders = ordersSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .map((order) => ({
        ...order,
        created_at_date: toDate(order.created_at),
        total_amount_num: toNumber(order.total_amount, 0)
      }))
      .filter((o) => o.created_at_date);

    const users = usersSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .map((user) => ({
        ...user,
        created_at_date: toDate(user.created_at)
      }));

    const products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const productsById = new Map(products.map((p) => [String(p.id), p]));

    const statuses = statusesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const statusesById = new Map(statuses.map((s) => [String(s.id), s]));

    const ordersToday = orders.filter((o) => o.created_at_date >= todayStart);
    const ordersWeek = orders.filter((o) => o.created_at_date >= weekStart);
    const ordersMonth = orders.filter((o) => o.created_at_date >= monthStart);

    const newUsersToday = users.filter((u) => u.created_at_date && u.created_at_date >= todayStart);
    const newUsersWeek = users.filter((u) => u.created_at_date && u.created_at_date >= weekStart);
    const newUsersMonth = users.filter((u) => u.created_at_date && u.created_at_date >= monthStart);

    const lowStockProducts = products.filter((p) => {
      const stock = toNumber(p.stock_quantity, 0);
      const threshold = toNumber(p.low_stock_threshold, 5);
      return stock > 0 && stock <= threshold && p.is_active !== false;
    });
    const outOfStockProducts = products.filter((p) => toNumber(p.stock_quantity, 0) === 0 && p.is_active !== false);

    const stats = {
      orders_today: ordersToday.length,
      orders_week: ordersWeek.length,
      orders_month: ordersMonth.length,
      revenue_today: ordersToday.reduce((sum, o) => sum + o.total_amount_num, 0),
      revenue_week: ordersWeek.reduce((sum, o) => sum + o.total_amount_num, 0),
      revenue_month: ordersMonth.reduce((sum, o) => sum + o.total_amount_num, 0),
      new_users_today: newUsersToday.length,
      new_users_week: newUsersWeek.length,
      new_users_month: newUsersMonth.length,
      low_stock_products: lowStockProducts.length,
      out_of_stock_products: outOfStockProducts.length
    };

    const revenueMap = new Map();
    ordersMonth.forEach((order) => {
      const key = order.created_at_date.toISOString().slice(0, 10);
      const current = revenueMap.get(key) || { date: key, orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += order.total_amount_num;
      revenueMap.set(key, current);
    });
    const revenueTrends = [...revenueMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    const topProductsMap = new Map();
    ordersMonth.forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((item) => {
        const productId = String(item.product_id || item.id || '');
        if (!productId) return;
        const product = productsById.get(productId);
        if (!product) return;

        const current = topProductsMap.get(productId) || {
          id: productId,
          name: product.name || 'Producto',
          slug: product.slug || '',
          price: toNumber(product.price, 0),
          stock_quantity: toNumber(product.stock_quantity, 0),
          image_url:
            product.image ||
            (Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]?.url || product.images[0]
              : '') ||
            '',
          category_name: product.category_name || null,
          brand_name: product.brand_name || null,
          total_sold: 0,
          total_revenue: 0
        };

        const qty = toNumber(item.quantity, 1);
        const unit = toNumber(item.unit_price, current.price);
        current.total_sold += qty;
        current.total_revenue += qty * unit;
        topProductsMap.set(productId, current);
      });
    });
    const topProducts = [...topProductsMap.values()]
      .sort((a, b) => b.total_sold - a.total_sold || b.total_revenue - a.total_revenue)
      .slice(0, 10);

    const salesLocationMap = new Map();
    ordersMonth.forEach((order) => {
      const city = order.city || order.shipping_city || order.billing_city || 'Sin especificar';
      const state = order.state || order.shipping_state || order.billing_state || 'Sin especificar';
      const key = `${city}|${state}`;
      const current = salesLocationMap.get(key) || {
        city,
        state,
        order_count: 0,
        total_revenue: 0
      };
      current.order_count += 1;
      current.total_revenue += order.total_amount_num;
      salesLocationMap.set(key, current);
    });
    const salesByLocation = [...salesLocationMap.values()]
      .sort((a, b) => b.total_revenue - a.total_revenue || b.order_count - a.order_count)
      .slice(0, 10);

    const stockAlerts = products
      .filter((p) => p.is_active !== false)
      .flatMap((p) => {
        const stock = toNumber(p.stock_quantity, 0);
        const threshold = toNumber(p.low_stock_threshold, 5);
        const base = {
          id: `stock-${p.id}`,
          product_id: p.id,
          product_name: p.name || 'Producto',
          product_slug: p.slug || '',
          sku: p.sku || null,
          price: toNumber(p.price, 0),
          image_url:
            p.image ||
            (Array.isArray(p.images) && p.images.length > 0 ? p.images[0]?.url || p.images[0] : '') ||
            '',
          current_stock: stock,
          threshold_value: threshold,
          created_at: p.updated_at || p.created_at || now.toISOString()
        };

        if (stock === 0) {
          return [{ ...base, alert_type: 'out_of_stock' }];
        }
        if (stock <= threshold) {
          return [{ ...base, alert_type: 'low_stock' }];
        }
        return [];
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 20);

    const usersById = new Map(users.map((u) => [String(u.id), u]));
    const recentOrders = [...orders]
      .sort((a, b) => b.created_at_date - a.created_at_date)
      .slice(0, 10)
      .map((order) => {
        const status = statusesById.get(String(order.status_id)) || {};
        const orderUser = order.user_id ? usersById.get(String(order.user_id)) : null;
        const items = Array.isArray(order.items) ? order.items : [];
        return {
          id: order.id,
          order_number: order.order_number || order.id,
          total_amount: order.total_amount_num,
          created_at: order.created_at_date.toISOString(),
          status_name: order.status_name || status.name || 'pending',
          status_color: order.status_color || status.color || '#64748b',
          customer_name:
            order.customer_name ||
            (orderUser ? `${orderUser.first_name || ''} ${orderUser.last_name || ''}`.trim() : '') ||
            'Guest',
          customer_email: order.customer_email || orderUser?.email || null,
          customer_phone: order.customer_phone || orderUser?.phone || null,
          item_count: items.length
        };
      });

    const monthlyMap = new Map();
    orders
      .filter((o) => o.created_at_date >= yearStart)
      .forEach((order) => {
        const month = `${order.created_at_date.getFullYear()}-${String(order.created_at_date.getMonth() + 1).padStart(2, '0')}-01`;
        const current = monthlyMap.get(month) || { month, orders: 0, revenue: 0 };
        current.orders += 1;
        current.revenue += order.total_amount_num;
        monthlyMap.set(month, current);
      });
    const monthlyRevenue = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    const statusDistMap = new Map();
    const statusesLast30 = ordersMonth;
    statusesLast30.forEach((order) => {
      const status = statusesById.get(String(order.status_id));
      const statusName = order.status_name || status?.name || 'pending';
      const statusColor = order.status_color || status?.color || '#64748b';
      const key = `${statusName}|${statusColor}`;
      const current = statusDistMap.get(key) || {
        name: statusName,
        color: statusColor,
        count: 0
      };
      current.count += 1;
      statusDistMap.set(key, current);
    });
    const orderStatusDistribution = [...statusDistMap.values()].sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        stats,
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
