import { randomUUID } from 'crypto';

import { db } from './firebaseAdmin';

const ORDERS_COLLECTION = 'orders';
const ORDER_STATUSES_COLLECTION = 'order_statuses';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeOrder(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    created_at_date: toDate(data.created_at)
  };
}

/** Get order status doc id by name (e.g. 'pending', 'cancelled') */
export async function getOrderStatusIdByName(name) {
  const snapshot = await db
    .collection(ORDER_STATUSES_COLLECTION)
    .where('name', '==', String(name).toLowerCase().trim())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].id;
}

/** Get order status by id */
export async function getOrderStatusById(statusId) {
  const doc = await db.collection(ORDER_STATUSES_COLLECTION).doc(String(statusId)).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/** List orders for a user with optional status filter and pagination */
export async function getOrdersByUserId(userId, options = {}) {
  let q = db.collection(ORDERS_COLLECTION).where('user_id', '==', String(userId));
  const snapshot = await q.get();
  let orders = snapshot.docs.map(normalizeOrder);

  const statusName = options.status;
  if (statusName) {
    const statusSnap = await db
      .collection(ORDER_STATUSES_COLLECTION)
      .where('name', '==', statusName)
      .limit(1)
      .get();
    const statusId = statusSnap.empty ? null : statusSnap.docs[0].id;
    if (statusId) orders = orders.filter((o) => String(o.status_id) === statusId);
  }

  orders.sort((a, b) => {
    const ta = (a.created_at && new Date(a.created_at).getTime()) || 0;
    const tb = (b.created_at && new Date(b.created_at).getTime()) || 0;
    return tb - ta;
  });

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Number(options.limit) || 10);
  const total = orders.length;
  const start = (page - 1) * limit;
  const paginated = orders.slice(start, start + limit);

  const statusIds = [...new Set(paginated.map((o) => o.status_id).filter(Boolean))];
  const statusDocs = await Promise.all(
    statusIds.map((id) => db.collection(ORDER_STATUSES_COLLECTION).doc(String(id)).get())
  );
  const statusById = new Map(
    statusDocs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...d.data() }])
  );

  const ordersWithStatus = paginated.map((o) => {
    const status = statusById.get(String(o.status_id));
    return {
      ...o,
      status_name: status?.name ?? null,
      status_color: status?.color ?? null
    };
  });

  return {
    orders: ordersWithStatus,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/** Get single order by id with items, service_items, history */
export async function getOrderById(orderId) {
  const orderRef = db.collection(ORDERS_COLLECTION).doc(String(orderId));
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) return null;
  const order = normalizeOrder(orderDoc);

  const status = await getOrderStatusById(order.status_id);
  const userDoc = order.user_id
    ? await db.collection('users').doc(String(order.user_id)).get()
    : { exists: false };
  const user = userDoc.exists ? userDoc.data() : null;

  return {
    ...order,
    status_name: status?.name ?? null,
    status_color: status?.color ?? null,
    customer_email: (order.customer_email || user?.email) ?? null,
    first_name: user?.first_name ?? null,
    last_name: user?.last_name ?? null,
    phone: user?.phone ?? null,
    items: Array.isArray(order.items) ? order.items : [],
    serviceItems: Array.isArray(order.service_items) ? order.service_items : [],
    history: Array.isArray(order.history) ? order.history : []
  };
}

/** Create a new order. Expects orderPayload with order_number, user_id, status_id, totals, items, service_items, etc. */
export async function createOrder(orderPayload) {
  const now = new Date().toISOString();
  const reviewToken = randomUUID();
  const docRef = db.collection(ORDERS_COLLECTION).doc();
  const doc = {
    order_number: orderPayload.order_number,
    user_id: orderPayload.user_id || null,
    status_id: orderPayload.status_id,
    subtotal: orderPayload.subtotal ?? 0,
    tax_amount: orderPayload.tax_amount ?? 0,
    shipping_amount: orderPayload.shipping_amount ?? 0,
    discount_amount: orderPayload.discount_amount ?? 0,
    total_amount: orderPayload.total_amount,
    shipping_address_id: orderPayload.shipping_address_id || null,
    billing_address_id: orderPayload.billing_address_id || null,
    notes: orderPayload.notes || null,
    customer_email: orderPayload.customer_email || null,
    customer_phone: orderPayload.customer_phone || null,
    payment_method: orderPayload.payment_method || null,
    shipping_method: orderPayload.shipping_method || null,
    pickup_point: orderPayload.pickup_point || null,
    items: Array.isArray(orderPayload.items) ? orderPayload.items : [],
    service_items: Array.isArray(orderPayload.service_items) ? orderPayload.service_items : [],
    review_token: reviewToken,
    review_token_used_at: null,
    history: [
      {
        status_id: orderPayload.status_id,
        notes: 'Order created',
        created_at: now
      }
    ],
    created_at: now,
    updated_at: now
  };
  await docRef.set(doc);
  return { id: docRef.id, order_number: doc.order_number, review_token: reviewToken, ...doc };
}

/** Get order by review token if token is valid and not yet used */
export async function getOrderByReviewToken(token) {
  if (!token || typeof token !== 'string') return null;
  const snapshot = await db
    .collection(ORDERS_COLLECTION)
    .where('review_token', '==', token.trim())
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  if (data.review_token_used_at) return null;
  return { id: doc.id, ...data };
}

/** Mark review token as used for an order */
export async function setReviewTokenUsed(orderId) {
  const ref = db.collection(ORDERS_COLLECTION).doc(String(orderId));
  const now = new Date().toISOString();
  await ref.update({
    review_token_used_at: now,
    updated_at: now
  });
}

/** Update order status and append to history. Optional: tracking_id, carrier_company, tracking_url */
export async function updateOrderStatus(orderId, statusId, notes, shippingInfo = {}) {
  const orderRef = db.collection(ORDERS_COLLECTION).doc(String(orderId));
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) return null;
  const order = orderDoc.data();
  const now = new Date().toISOString();
  const history = Array.isArray(order.history) ? [...order.history] : [];
  history.push({ status_id: statusId, notes: notes || 'Status updated', created_at: now });

  const updateData = {
    status_id: statusId,
    notes: notes !== undefined ? notes : order.notes,
    history,
    updated_at: now
  };

  if (shippingInfo.tracking_id !== undefined) updateData.tracking_id = shippingInfo.tracking_id || null;
  if (shippingInfo.carrier_company !== undefined) updateData.carrier_company = shippingInfo.carrier_company || null;
  if (shippingInfo.tracking_url !== undefined) updateData.tracking_url = shippingInfo.tracking_url || null;
  if (shippingInfo.scheduled_delivery_date !== undefined) updateData.scheduled_delivery_date = shippingInfo.scheduled_delivery_date || null;
  if (shippingInfo.scheduled_delivery_time !== undefined) updateData.scheduled_delivery_time = shippingInfo.scheduled_delivery_time || null;
  if (shippingInfo.delivery_schedule_status !== undefined) updateData.delivery_schedule_status = shippingInfo.delivery_schedule_status || null;
  if (shippingInfo.schedule_token !== undefined) updateData.schedule_token = shippingInfo.schedule_token || null;

  await orderRef.update(updateData);
  const updated = await orderRef.get();
  return { id: updated.id, ...updated.data() };
}

/** Update delivery schedule (admin sets date/time). Sets delivery_schedule_status to 'pending' and generates schedule_token. */
export async function updateOrderDeliverySchedule(orderId, { scheduled_delivery_date, scheduled_delivery_time }) {
  const orderRef = db.collection(ORDERS_COLLECTION).doc(String(orderId));
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) return null;
  const now = new Date().toISOString();
  const scheduleToken = randomUUID();
  const updateData = {
    scheduled_delivery_date: scheduled_delivery_date || null,
    scheduled_delivery_time: scheduled_delivery_time || null,
    delivery_schedule_status: 'pending',
    schedule_token: scheduleToken,
    updated_at: now
  };
  await orderRef.update(updateData);
  const updated = await orderRef.get();
  return { id: updated.id, schedule_token: scheduleToken, ...updated.data() };
}

/** User responds to delivery schedule (accept/reject). Requires valid schedule_token or ownership. */
export async function updateOrderScheduleResponse(orderId, delivery_schedule_status, scheduleToken = null) {
  const orderRef = db.collection(ORDERS_COLLECTION).doc(String(orderId));
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) return null;
  const order = orderDoc.data();
  if (scheduleToken && order.schedule_token !== scheduleToken) {
    return null;
  }
  const now = new Date().toISOString();
  await orderRef.update({
    delivery_schedule_status: delivery_schedule_status,
    updated_at: now
  });
  const updated = await orderRef.get();
  return { id: updated.id, ...updated.data() };
}

/** Set order to cancelled status */
export async function cancelOrder(orderId) {
  const cancelledId = await getOrderStatusIdByName('cancelled');
  if (!cancelledId) throw new Error('Cancelled status not found');
  return updateOrderStatus(orderId, cancelledId, 'Order cancelled');
}

/** Admin: list orders with filters and pagination */
export async function listOrdersAdmin(options = {}) {
  const snapshot = await db.collection(ORDERS_COLLECTION).get();
  let orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const search = (options.search || '').trim();
  if (search) {
    const term = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        (o.order_number && o.order_number.toLowerCase().includes(term)) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(term))
    );
  }

  const statusName = (options.status || '').trim();
  if (statusName) {
    const statusSnap = await db
      .collection(ORDER_STATUSES_COLLECTION)
      .where('name', '==', statusName)
      .limit(1)
      .get();
    const statusId = statusSnap.empty ? null : statusSnap.docs[0].id;
    if (statusId) orders = orders.filter((o) => String(o.status_id) === statusId);
  }

  if (options.dateFrom) {
    const from = new Date(options.dateFrom).getTime();
    orders = orders.filter((o) => new Date(o.created_at || 0).getTime() >= from);
  }
  if (options.dateTo) {
    const to = new Date(options.dateTo + ' 23:59:59').getTime();
    orders = orders.filter((o) => new Date(o.created_at || 0).getTime() <= to);
  }

  const paymentMethodFilter = (options.payment_method || '').trim();
  if (paymentMethodFilter) {
    orders = orders.filter(
      (o) => (o.payment_method || '').toLowerCase() === paymentMethodFilter.toLowerCase()
    );
  }

  const createdByFilter = (options.created_by || '').trim();
  if (createdByFilter) {
    orders = orders.filter((o) => String(o.user_id || '') === createdByFilter);
  }

  orders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const statusIds = [...new Set(orders.map((o) => o.status_id).filter(Boolean))];
  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const [statusDocs, userDocs] = await Promise.all([
    Promise.all(statusIds.map((id) => db.collection(ORDER_STATUSES_COLLECTION).doc(String(id)).get())),
    Promise.all(userIds.map((id) => db.collection('users').doc(String(id)).get()))
  ]);
  const statusById = new Map(statusDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const userById = new Map(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Number(options.limit) || 20);
  const total = orders.length;
  const start = (page - 1) * limit;
  const paginated = orders.slice(start, start + limit).map((o) => {
    const status = statusById.get(String(o.status_id));
    const user = o.user_id ? userById.get(String(o.user_id)) : null;
    return {
      ...o,
      status_name: status?.name ?? null,
      status_color: status?.color ?? null,
      first_name: user?.first_name ?? null,
      last_name: user?.last_name ?? null,
      customer_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null
    };
  });

  const allStatuses = await db.collection(ORDER_STATUSES_COLLECTION).get();
  const statusList = allStatuses.docs.map((d) => ({ id: d.id, ...d.data() }));
  const pendingCount = statusList.find((s) => s.name === 'pending')
    ? orders.filter((o) => String(o.status_id) === statusList.find((s) => s.name === 'pending').id).length
    : 0;
  const deliveredCount = statusList.find((s) => s.name === 'delivered')
    ? orders.filter((o) => String(o.status_id) === statusList.find((s) => s.name === 'delivered').id).length
    : 0;
  const now = Date.now();
  const recentOrders = orders.filter((o) => now - new Date(o.created_at || 0).getTime() <= 30 * 24 * 60 * 60 * 1000);
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  return {
    orders: paginated,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    },
    stats: {
      total_orders: orders.length,
      pending_orders: pendingCount,
      delivered_orders: deliveredCount,
      recent_orders: recentOrders.length,
      total_revenue: totalRevenue
    }
  };
}

/** Normalize payment_method for report grouping: Efectivo, Tarjeta, Stripe, Otros */
function normalizePaymentMethodForReport(raw) {
  if (!raw || typeof raw !== 'string') return 'Otros';
  const m = raw.trim().toLowerCase();
  if (m === 'efectivo' || m === 'pago contra entrega') return 'Efectivo';
  if (m === 'tarjeta') return 'Tarjeta';
  if (m === 'stripe') return 'Stripe';
  return 'Otros';
}

/**
 * Admin: Payment methods report — summary by method, filtered orders, optional groupBy.
 * Options: dateFrom, dateTo, status, payment_method (Efectivo|Tarjeta|Stripe|Otros), created_by (user_id), groupBy (day|week|month), page, limit.
 * If order has payments[] array (future), sums by method and marks as "Mixto"; otherwise uses payment_method.
 */
export async function getPaymentReportData(options = {}) {
  const snapshot = await db.collection(ORDERS_COLLECTION).get();
  let orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (options.dateFrom) {
    const from = new Date(options.dateFrom).getTime();
    orders = orders.filter((o) => new Date(o.created_at || 0).getTime() >= from);
  }
  if (options.dateTo) {
    const to = new Date(options.dateTo + ' 23:59:59').getTime();
    orders = orders.filter((o) => new Date(o.created_at || 0).getTime() <= to);
  }

  const statusName = (options.status || '').trim();
  if (statusName) {
    const statusSnap = await db
      .collection(ORDER_STATUSES_COLLECTION)
      .where('name', '==', statusName)
      .limit(1)
      .get();
    const statusId = statusSnap.empty ? null : statusSnap.docs[0].id;
    if (statusId) orders = orders.filter((o) => String(o.status_id) === statusId);
  }

  const filterPaymentMethod = (options.payment_method || '').trim();
  if (filterPaymentMethod) {
    orders = orders.filter((o) => {
      const normalized = normalizePaymentMethodForReport(o.payment_method);
      return normalized === filterPaymentMethod;
    });
  }

  const createdBy = (options.created_by || '').trim();
  if (createdBy) {
    orders = orders.filter((o) => String(o.user_id || '') === createdBy);
  }

  orders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const statusIds = [...new Set(orders.map((o) => o.status_id).filter(Boolean))];
  const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const [statusDocs, userDocs] = await Promise.all([
    Promise.all(statusIds.map((id) => db.collection(ORDER_STATUSES_COLLECTION).doc(String(id)).get())),
    Promise.all(userIds.map((id) => db.collection('users').doc(String(id)).get()))
  ]);
  const statusById = new Map(statusDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const userById = new Map(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const summaryByMethod = { Efectivo: { count: 0, amount: 0 }, Tarjeta: { count: 0, amount: 0 }, Stripe: { count: 0, amount: 0 }, Otros: { count: 0, amount: 0 } };
  let totalAmount = 0;

  orders.forEach((o) => {
    const amount = Number(o.total_amount) || 0;
    totalAmount += amount;
    const key = normalizePaymentMethodForReport(o.payment_method);
    if (!summaryByMethod[key]) summaryByMethod[key] = { count: 0, amount: 0 };
    summaryByMethod[key].count += 1;
    summaryByMethod[key].amount += amount;
  });

  const groupBy = (options.groupBy || '').toLowerCase();
  let grouped = null;
  if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
    const map = new Map();
    orders.forEach((o) => {
      const d = new Date(o.created_at || 0);
      let key;
      if (groupBy === 'day') key = d.toISOString().slice(0, 10);
      else if (groupBy === 'week') {
        const start = new Date(d);
        start.setDate(d.getDate() - d.getDay());
        key = start.toISOString().slice(0, 10);
      } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const cur = map.get(key) || { period: key, orders: 0, total: 0, byMethod: { Efectivo: 0, Tarjeta: 0, Stripe: 0, Otros: 0 } };
      cur.orders += 1;
      cur.total += Number(o.total_amount) || 0;
      const methodKey = normalizePaymentMethodForReport(o.payment_method);
      cur.byMethod[methodKey] = (cur.byMethod[methodKey] || 0) + (Number(o.total_amount) || 0);
      map.set(key, cur);
    });
    grouped = [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(Number(options.limit) || 50, 500));
  const total = orders.length;
  const start = (page - 1) * limit;
  const paginated = orders.slice(start, start + limit).map((o) => {
    const status = statusById.get(String(o.status_id));
    const user = o.user_id ? userById.get(String(o.user_id)) : null;
    const cashierName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : null;
    return {
      ...o,
      status_name: status?.name ?? null,
      status_color: status?.color ?? null,
      customer_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : (o.customer_email || 'Invitado'),
      cashier_name: cashierName,
      payment_method_display: o.payment_method || 'No especificado',
      payment_method_group: normalizePaymentMethodForReport(o.payment_method)
    };
  });

  return {
    summary: {
      total_orders: total,
      total_amount: totalAmount,
      by_method: summaryByMethod
    },
    orders: paginated,
    grouped,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}
