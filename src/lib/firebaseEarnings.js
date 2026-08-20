import { db } from './firebaseAdmin';
import { getExpensesSummary } from './firebaseExpenses';

const ORDERS_COLLECTION = 'orders';
const ORDER_STATUSES_COLLECTION = 'order_statuses';
const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';

// Statuses that represent a real, paid/completed sale (used when statusScope === 'paid').
const PAID_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];
// Statuses that never count as revenue.
const EXCLUDED_STATUSES = ['cancelled', 'refunded'];

// Fallback cost ratio when a product has no cost_price, matching the inventory report.
const COST_FALLBACK_RATIO = 0.6;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function toTs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Admin: earnings / profit report over a date range.
 *
 * Revenue is computed from order line items (products + services), COGS from
 * product cost (snapshot `unit_cost` if present, else current `cost_price`, else
 * a 60% fallback). Net profit subtracts registered expenses in the same range.
 *
 * Options:
 *  - dateFrom, dateTo (YYYY-MM-DD)
 *  - statusScope: 'paid' (default) | 'all'
 *  - status: specific status name (overrides statusScope)
 */
export async function getEarningsReportData(options = {}) {
  const snapshot = await db.collection(ORDERS_COLLECTION).get();
  let orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (options.dateFrom) {
    const from = toTs(options.dateFrom);
    if (from !== null) {
      orders = orders.filter((o) => (toTs(o.created_at) || 0) >= from);
    }
  }
  if (options.dateTo) {
    const to = toTs(`${options.dateTo}T23:59:59`);
    if (to !== null) {
      orders = orders.filter((o) => (toTs(o.created_at) || 0) <= to);
    }
  }

  // Resolve status names for the filtered orders.
  const statusIds = [...new Set(orders.map((o) => o.status_id).filter(Boolean))];
  const statusDocs = await Promise.all(
    statusIds.map((id) => db.collection(ORDER_STATUSES_COLLECTION).doc(String(id)).get())
  );
  const statusNameById = new Map(
    statusDocs.filter((d) => d.exists).map((d) => [d.id, String(d.data().name || '').toLowerCase()])
  );

  const getStatusName = (o) => statusNameById.get(String(o.status_id)) || '';

  const explicitStatus = (options.status || '').trim().toLowerCase();
  const statusScope = (options.statusScope || 'paid').toLowerCase();

  if (explicitStatus) {
    orders = orders.filter((o) => getStatusName(o) === explicitStatus);
  } else if (statusScope === 'all') {
    orders = orders.filter((o) => !EXCLUDED_STATUSES.includes(getStatusName(o)));
  } else {
    orders = orders.filter((o) => PAID_STATUSES.includes(getStatusName(o)));
  }

  // Collect product ids to resolve cost + category when not snapshotted.
  const productIds = new Set();
  orders.forEach((o) => {
    (Array.isArray(o.items) ? o.items : []).forEach((item) => {
      if (item?.product_id) productIds.add(String(item.product_id));
    });
  });

  const productDocs = await Promise.all(
    [...productIds].map((id) => db.collection(PRODUCTS_COLLECTION).doc(String(id)).get())
  );
  const productById = new Map(
    productDocs.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  // Aggregations
  let productRevenue = 0;
  let serviceRevenue = 0;
  let cogs = 0;
  let discounts = 0;
  let shippingCollected = 0;

  const byProduct = new Map();
  const byCategoryId = new Map();
  const categoryIds = new Set();

  orders.forEach((o) => {
    discounts += toNumber(o.discount_amount, 0);
    shippingCollected += toNumber(o.shipping_amount, 0);

    (Array.isArray(o.items) ? o.items : []).forEach((item) => {
      const productId = item?.product_id ? String(item.product_id) : null;
      const product = productId ? productById.get(productId) : null;
      const quantity = toNumber(item?.quantity, 0);
      const unitPrice = toNumber(item?.unit_price, 0);
      const lineRevenue = roundMoney(
        toNumber(item?.total_price, unitPrice * quantity)
      );

      // Cost precedence: snapshot on the line item, then current product cost, then fallback.
      let unitCost;
      if (item?.unit_cost !== undefined && item?.unit_cost !== null) {
        unitCost = toNumber(item.unit_cost, 0);
      } else if (product && product.cost_price !== undefined && product.cost_price !== null) {
        unitCost = toNumber(product.cost_price, 0);
      } else {
        unitCost = unitPrice * COST_FALLBACK_RATIO;
      }
      const lineCost = roundMoney(unitCost * quantity);

      productRevenue += lineRevenue;
      cogs += lineCost;

      // Per-product breakdown
      const key = productId || `name:${item?.product_name || 'desconocido'}`;
      const existing = byProduct.get(key) || {
        product_id: productId,
        product_name: item?.product_name || product?.name || 'Producto',
        quantity: 0,
        revenue: 0,
        cost: 0
      };
      existing.quantity += quantity;
      existing.revenue = roundMoney(existing.revenue + lineRevenue);
      existing.cost = roundMoney(existing.cost + lineCost);
      byProduct.set(key, existing);

      // Per-category breakdown
      const categoryId = item?.category_id || product?.category_id || null;
      if (categoryId) categoryIds.add(String(categoryId));
      const catKey = categoryId ? String(categoryId) : 'sin-categoria';
      const cat = byCategoryId.get(catKey) || {
        category_id: categoryId,
        category_name: null,
        revenue: 0,
        cost: 0
      };
      cat.revenue = roundMoney(cat.revenue + lineRevenue);
      cat.cost = roundMoney(cat.cost + lineCost);
      byCategoryId.set(catKey, cat);
    });

    (Array.isArray(o.service_items) ? o.service_items : []).forEach((item) => {
      const quantity = toNumber(item?.quantity, 0);
      const unitPrice = toNumber(item?.unit_price, 0);
      serviceRevenue += roundMoney(toNumber(item?.total_price, unitPrice * quantity));
    });
  });

  // Resolve category names.
  const categoryDocs = await Promise.all(
    [...categoryIds].map((id) => db.collection(CATEGORIES_COLLECTION).doc(String(id)).get())
  );
  const categoryNameById = new Map(
    categoryDocs.filter((d) => d.exists).map((d) => [d.id, d.data().name || null])
  );
  const byCategory = [...byCategoryId.values()].map((cat) => ({
    ...cat,
    category_name: cat.category_id
      ? categoryNameById.get(String(cat.category_id)) || 'Sin categoría'
      : 'Sin categoría',
    profit: roundMoney(cat.revenue - cat.cost)
  }));
  byCategory.sort((a, b) => b.profit - a.profit);

  const products = [...byProduct.values()].map((p) => ({
    ...p,
    profit: roundMoney(p.revenue - p.cost)
  }));
  products.sort((a, b) => b.profit - a.profit);

  // Expenses in the same range.
  const expensesSummary = await getExpensesSummary({
    dateFrom: options.dateFrom,
    dateTo: options.dateTo
  });

  productRevenue = roundMoney(productRevenue);
  serviceRevenue = roundMoney(serviceRevenue);
  cogs = roundMoney(cogs);
  discounts = roundMoney(discounts);
  shippingCollected = roundMoney(shippingCollected);

  const grossRevenue = roundMoney(productRevenue + serviceRevenue);
  const netRevenue = roundMoney(grossRevenue - discounts);
  const grossProfit = roundMoney(netRevenue - cogs);
  const expensesTotal = roundMoney(expensesSummary.total);
  const netProfit = roundMoney(grossProfit - expensesTotal);
  const margin = netRevenue > 0 ? roundMoney((netProfit / netRevenue) * 100) : 0;

  return {
    summary: {
      orders_count: orders.length,
      product_revenue: productRevenue,
      service_revenue: serviceRevenue,
      gross_revenue: grossRevenue,
      discounts,
      net_revenue: netRevenue,
      shipping_collected: shippingCollected,
      cogs,
      gross_profit: grossProfit,
      expenses_total: expensesTotal,
      net_profit: netProfit,
      net_margin_pct: margin
    },
    expenses_by_category: expensesSummary.byCategory,
    products,
    categories: byCategory
  };
}
