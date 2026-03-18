import { randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';

const COUPONS_COLLECTION = 'coupons';
const COUPON_REDEMPTIONS_COLLECTION = 'coupon_redemptions';
const LEGACY_USER_COUPONS_COLLECTION = 'user_coupons';
const FIRST_REVIEW_SOURCE = 'FIRST_REVIEW';

const VALID_SCOPE_TYPES = ['global', 'brand', 'franchise', 'category', 'subcategory', 'product'];
const VALID_TARGET_TYPES = ['all', 'user', 'email_segment'];
const VALID_DISCOUNT_TYPES = ['percentage', 'fixed'];
const VALID_USAGE_MODES = ['single_use', 'multi_use'];

function toIsoOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function normalizeArrayIds(values = []) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))];
}

function nowIso() {
  return new Date().toISOString();
}

function generateCouponCode(prefix = 'DINGER') {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

function normalizeCouponShape(raw = {}) {
  const discountType = VALID_DISCOUNT_TYPES.includes(raw.discount_type)
    ? raw.discount_type
    : (raw.type === 'fixed' ? 'fixed' : 'percentage');

  const discountValue = toNumber(
    raw.discount_value !== undefined ? raw.discount_value : raw.value,
    0
  );

  const coupon = {
    code: normalizeCode(raw.code),
    active: raw.active !== false,
    valid_from: toIsoOrNull(raw.valid_from),
    expires_at: toIsoOrNull(raw.expires_at),
    timezone: String(raw.timezone || 'UTC'),
    discount_type: discountType,
    discount_value: discountValue,
    max_discount_amount: raw.max_discount_amount == null ? null : toNumber(raw.max_discount_amount, 0),
    min_order_amount: raw.min_order_amount == null ? 0 : toNumber(raw.min_order_amount, 0),
    scope_type: VALID_SCOPE_TYPES.includes(raw.scope_type) ? raw.scope_type : 'global',
    scope_ids: normalizeArrayIds(raw.scope_ids),
    target_type: VALID_TARGET_TYPES.includes(raw.target_type) ? raw.target_type : 'all',
    target_user_id: raw.target_user_id ? String(raw.target_user_id) : null,
    target_email_normalized: raw.target_email_normalized ? normalizeEmail(raw.target_email_normalized) : null,
    usage_mode: VALID_USAGE_MODES.includes(raw.usage_mode) ? raw.usage_mode : 'single_use',
    max_redemptions_total: raw.max_redemptions_total == null ? null : Math.max(1, Math.floor(toNumber(raw.max_redemptions_total, 1))),
    max_redemptions_per_user: raw.max_redemptions_per_user == null ? null : Math.max(1, Math.floor(toNumber(raw.max_redemptions_per_user, 1))),
    redemptions_count: Math.max(0, Math.floor(toNumber(raw.redemptions_count, 0))),
    source: raw.source || null,
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}
  };

  if (coupon.usage_mode === 'single_use') {
    if (coupon.max_redemptions_total == null) coupon.max_redemptions_total = 1;
    if (coupon.max_redemptions_per_user == null) coupon.max_redemptions_per_user = 1;
  }

  if (coupon.target_type === 'user' && !coupon.target_user_id) {
    throw new Error('target_user_id is required when target_type is user');
  }
  if (coupon.target_type === 'email_segment' && !coupon.target_email_normalized) {
    throw new Error('target_email_normalized is required when target_type is email_segment');
  }
  if (coupon.scope_type !== 'global' && coupon.scope_ids.length === 0) {
    throw new Error('scope_ids are required for non-global coupons');
  }
  if (!coupon.code) {
    throw new Error('Coupon code is required');
  }
  if (!VALID_DISCOUNT_TYPES.includes(coupon.discount_type)) {
    throw new Error('Invalid discount type');
  }
  if (coupon.discount_type === 'percentage' && (coupon.discount_value <= 0 || coupon.discount_value > 100)) {
    throw new Error('Percentage discount must be between 0 and 100');
  }
  if (coupon.discount_type === 'fixed' && coupon.discount_value <= 0) {
    throw new Error('Fixed discount must be greater than 0');
  }

  return coupon;
}

function couponIsInTimeWindow(coupon, currentDate = new Date()) {
  const now = currentDate.getTime();
  const startsAt = coupon.valid_from ? new Date(coupon.valid_from).getTime() : null;
  const expiresAt = coupon.expires_at ? new Date(coupon.expires_at).getTime() : null;
  if (startsAt && startsAt > now) return false;
  if (expiresAt && expiresAt < now) return false;
  return true;
}

function couponTargetsActor(coupon, actor = {}) {
  const actorUserId = actor.userId ? String(actor.userId) : null;
  const actorEmail = actor.customerEmail ? normalizeEmail(actor.customerEmail) : null;

  if (coupon.target_type === 'all') return true;
  if (coupon.target_type === 'user') return Boolean(actorUserId && coupon.target_user_id && actorUserId === String(coupon.target_user_id));
  if (coupon.target_type === 'email_segment') return Boolean(actorEmail && coupon.target_email_normalized && actorEmail === coupon.target_email_normalized);
  return false;
}

function itemMatchesScope(item, coupon) {
  if (coupon.scope_type === 'global') return true;
  const scopeIds = new Set((coupon.scope_ids || []).map(String));
  if (scopeIds.size === 0) return false;

  const productId = item.product_id != null ? String(item.product_id) : null;
  const categoryId = item.category_id != null ? String(item.category_id) : null;
  const subcategoryId = item.subcategory_id != null ? String(item.subcategory_id) : null;
  const manufacturerBrandId = item.manufacturer_brand_id != null ? String(item.manufacturer_brand_id) : null;
  const franchiseBrandId = item.franchise_brand_id != null ? String(item.franchise_brand_id) : null;
  const legacyBrandId = item.brand_id != null ? String(item.brand_id) : null;

  switch (coupon.scope_type) {
    case 'product':
      return Boolean(productId && scopeIds.has(productId));
    case 'category':
      return Boolean(categoryId && scopeIds.has(categoryId));
    case 'subcategory':
      return Boolean(subcategoryId && scopeIds.has(subcategoryId));
    case 'franchise':
      return Boolean(franchiseBrandId && scopeIds.has(franchiseBrandId));
    case 'brand':
      return Boolean(
        (manufacturerBrandId && scopeIds.has(manufacturerBrandId)) ||
        (franchiseBrandId && scopeIds.has(franchiseBrandId)) ||
        (legacyBrandId && scopeIds.has(legacyBrandId))
      );
    default:
      return false;
  }
}

function computeDiscountAmount(coupon, eligibleSubtotal) {
  if (eligibleSubtotal <= 0) return 0;
  let discount = coupon.discount_type === 'fixed'
    ? Math.min(coupon.discount_value, eligibleSubtotal)
    : eligibleSubtotal * (coupon.discount_value / 100);

  if (coupon.max_discount_amount != null) {
    discount = Math.min(discount, coupon.max_discount_amount);
  }

  return roundMoney(discount);
}

async function getRedemptionsForActor(couponId, actor = {}, transaction = null) {
  const actorUserId = actor.userId ? String(actor.userId) : null;
  const actorEmail = actor.customerEmail ? normalizeEmail(actor.customerEmail) : null;

  if (!actorUserId && !actorEmail) return 0;

  const baseQuery = db
    .collection(COUPON_REDEMPTIONS_COLLECTION)
    .where('coupon_id', '==', String(couponId))
    .where(actorUserId ? 'actor_user_id' : 'actor_email', '==', actorUserId || actorEmail);

  const snapshot = transaction ? await transaction.get(baseQuery) : await baseQuery.get();
  return snapshot.size;
}

async function getCouponByCode(code, transaction = null) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const newQuery = db
    .collection(COUPONS_COLLECTION)
    .where('code', '==', normalizedCode)
    .limit(1);
  const newSnapshot = transaction ? await transaction.get(newQuery) : await newQuery.get();
  if (!newSnapshot.empty) {
    const doc = newSnapshot.docs[0];
    return {
      id: doc.id,
      source_collection: COUPONS_COLLECTION,
      ...normalizeCouponShape(doc.data())
    };
  }

  const legacyQuery = db
    .collection(LEGACY_USER_COUPONS_COLLECTION)
    .where('code', '==', normalizedCode)
    .limit(1);
  const legacySnapshot = transaction ? await transaction.get(legacyQuery) : await legacyQuery.get();
  if (legacySnapshot.empty) return null;
  const legacyDoc = legacySnapshot.docs[0];
  const legacyData = legacyDoc.data();
  return {
    id: legacyDoc.id,
    source_collection: LEGACY_USER_COUPONS_COLLECTION,
    code: normalizeCode(legacyData.code),
    active: !legacyData.used_at,
    valid_from: null,
    expires_at: toIsoOrNull(legacyData.expires_at),
    timezone: 'UTC',
    discount_type: legacyData.type === 'fixed' ? 'fixed' : 'percentage',
    discount_value: toNumber(legacyData.value, 0),
    max_discount_amount: null,
    min_order_amount: 0,
    scope_type: 'global',
    scope_ids: [],
    target_type: legacyData.user_id ? 'user' : 'all',
    target_user_id: legacyData.user_id ? String(legacyData.user_id) : null,
    target_email_normalized: null,
    usage_mode: 'single_use',
    max_redemptions_total: 1,
    max_redemptions_per_user: 1,
    redemptions_count: legacyData.used_at ? 1 : 0,
    used_at: legacyData.used_at || null,
    source: legacyData.source || null,
    metadata: { legacy: true },
    created_at: legacyData.created_at || null,
    updated_at: legacyData.updated_at || legacyData.created_at || null
  };
}

export function evaluateCoupon(coupon, context = {}) {
  const {
    userId = null,
    customerEmail = null,
    items = [],
    orderSubtotal = 0,
    actorRedemptionsCount = 0
  } = context;

  if (!coupon) return { valid: false, reason_code: 'NOT_FOUND' };
  if (coupon.active === false) return { valid: false, reason_code: 'INACTIVE' };
  if (!couponIsInTimeWindow(coupon)) return { valid: false, reason_code: 'OUTSIDE_VALIDITY_WINDOW' };
  if (!couponTargetsActor(coupon, { userId, customerEmail })) return { valid: false, reason_code: 'NOT_ALLOWED_FOR_ACTOR' };

  const totalRedemptions = toNumber(coupon.redemptions_count, 0);
  if (coupon.max_redemptions_total != null && totalRedemptions >= coupon.max_redemptions_total) {
    return { valid: false, reason_code: 'TOTAL_REDEMPTIONS_EXCEEDED' };
  }
  if (coupon.max_redemptions_per_user != null && actorRedemptionsCount >= coupon.max_redemptions_per_user) {
    return { valid: false, reason_code: 'ACTOR_REDEMPTIONS_EXCEEDED' };
  }

  const normalizedItems = Array.isArray(items) ? items : [];
  const eligibleItems = normalizedItems.filter((item) => itemMatchesScope(item, coupon));
  const eligibleSubtotal = roundMoney(
    eligibleItems.reduce((sum, item) => sum + roundMoney(toNumber(item.unit_price, 0) * Math.max(1, toNumber(item.quantity, 1))), 0)
  );

  if (coupon.min_order_amount > 0 && roundMoney(orderSubtotal) < roundMoney(coupon.min_order_amount)) {
    return {
      valid: false,
      reason_code: 'MIN_ORDER_NOT_MET',
      min_order_amount: coupon.min_order_amount
    };
  }

  if (eligibleSubtotal <= 0) {
    return { valid: false, reason_code: 'NO_ELIGIBLE_ITEMS' };
  }

  const discountAmount = computeDiscountAmount(coupon, eligibleSubtotal);
  if (discountAmount <= 0) {
    return { valid: false, reason_code: 'NO_DISCOUNT' };
  }

  return {
    valid: true,
    reason_code: 'OK',
    discount_amount: discountAmount,
    eligible_subtotal: eligibleSubtotal,
    eligible_items_count: eligibleItems.length
  };
}

export async function createCoupon(payload, actorUserId = null) {
  const normalized = normalizeCouponShape(payload);
  const code = normalizeCode(normalized.code);
  const existingSnapshot = await db.collection(COUPONS_COLLECTION).where('code', '==', code).limit(1).get();
  if (!existingSnapshot.empty) {
    throw new Error('Coupon code already exists');
  }

  const now = nowIso();
  const docRef = db.collection(COUPONS_COLLECTION).doc();
  const created = {
    ...normalized,
    code,
    created_by: actorUserId ? String(actorUserId) : null,
    last_updated_by: actorUserId ? String(actorUserId) : null,
    created_at: now,
    updated_at: now
  };
  await docRef.set(created);
  return { id: docRef.id, ...created };
}

export async function listCouponsAdmin(filters = {}) {
  const snapshot = await db.collection(COUPONS_COLLECTION).get();
  let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const q = String(filters.q || '').trim().toLowerCase();
  if (q) {
    items = items.filter((item) => {
      const haystack = `${item.code || ''} ${item.source || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  if (filters.active === 'true' || filters.active === true) {
    items = items.filter((item) => item.active !== false);
  } else if (filters.active === 'false' || filters.active === false) {
    items = items.filter((item) => item.active === false);
  }

  if (filters.scope_type) {
    items = items.filter((item) => String(item.scope_type || 'global') === String(filters.scope_type));
  }

  items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return items;
}

export async function updateCoupon(couponId, patch = {}, actorUserId = null) {
  const ref = db.collection(COUPONS_COLLECTION).doc(String(couponId));
  const existingDoc = await ref.get();
  if (!existingDoc.exists) return null;
  const existing = existingDoc.data();
  const merged = normalizeCouponShape({
    ...existing,
    ...patch,
    code: patch.code ? normalizeCode(patch.code) : existing.code
  });

  const now = nowIso();
  const payload = {
    ...merged,
    updated_at: now,
    last_updated_by: actorUserId ? String(actorUserId) : existing.last_updated_by || null
  };
  await ref.update(payload);
  return { id: existingDoc.id, ...existing, ...payload };
}

export async function toggleCouponActive(couponId, active, actorUserId = null) {
  const ref = db.collection(COUPONS_COLLECTION).doc(String(couponId));
  const existingDoc = await ref.get();
  if (!existingDoc.exists) return null;
  const now = nowIso();
  const payload = {
    active: Boolean(active),
    updated_at: now,
    last_updated_by: actorUserId ? String(actorUserId) : null
  };
  await ref.update(payload);
  return { id: existingDoc.id, ...existingDoc.data(), ...payload };
}

/** Check if user already has a FIRST_REVIEW coupon (used or not) */
export async function userHasFirstReviewCoupon(userId) {
  if (!userId) return false;

  const [newCoupons, legacyCoupons] = await Promise.all([
    db
      .collection(COUPONS_COLLECTION)
      .where('target_type', '==', 'user')
      .where('target_user_id', '==', String(userId))
      .where('source', '==', FIRST_REVIEW_SOURCE)
      .limit(1)
      .get(),
    db
      .collection(LEGACY_USER_COUPONS_COLLECTION)
      .where('user_id', '==', String(userId))
      .where('source', '==', FIRST_REVIEW_SOURCE)
      .limit(1)
      .get()
  ]);

  return !newCoupons.empty || !legacyCoupons.empty;
}

/** Create a coupon for first review signup. Returns null if already granted */
export async function createFirstReviewCoupon(userId) {
  if (!userId) throw new Error('User ID is required');
  const alreadyHas = await userHasFirstReviewCoupon(userId);
  if (alreadyHas) return null;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const created = await createCoupon(
    {
      code: generateCouponCode('RESENA5'),
      active: true,
      discount_type: 'percentage',
      discount_value: 5,
      max_discount_amount: null,
      min_order_amount: 0,
      scope_type: 'global',
      scope_ids: [],
      target_type: 'user',
      target_user_id: String(userId),
      usage_mode: 'single_use',
      valid_from: nowIso(),
      expires_at: expiresAt.toISOString(),
      source: FIRST_REVIEW_SOURCE,
      metadata: { campaign: FIRST_REVIEW_SOURCE }
    },
    String(userId)
  );

  return created;
}

/** Get coupons available for profile view */
export async function getCouponsByUserId(userId, userEmail = null) {
  if (!userId && !userEmail) return [];
  const normalizedUserId = userId ? String(userId) : null;
  const normalizedEmail = userEmail ? normalizeEmail(userEmail) : null;

  const [newSnapshot, legacySnapshot] = await Promise.all([
    db.collection(COUPONS_COLLECTION).get(),
    normalizedUserId
      ? db
          .collection(LEGACY_USER_COUPONS_COLLECTION)
          .where('user_id', '==', normalizedUserId)
          .get()
      : Promise.resolve({ docs: [] })
  ]);

  const newCoupons = newSnapshot.docs
    .map((doc) => ({ id: doc.id, ...normalizeCouponShape(doc.data()), created_at: doc.data().created_at, used_at: doc.data().used_at || null }))
    .filter((coupon) => {
      if (coupon.target_type === 'all') return true;
      if (coupon.target_type === 'user') return Boolean(normalizedUserId && coupon.target_user_id === normalizedUserId);
      if (coupon.target_type === 'email_segment') return Boolean(normalizedEmail && coupon.target_email_normalized === normalizedEmail);
      return false;
    });

  const legacyCoupons = (legacySnapshot.docs || []).map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      code: normalizeCode(data.code),
      type: data.type || 'percentage',
      value: toNumber(data.value, 0),
      discount_type: data.type || 'percentage',
      discount_value: toNumber(data.value, 0),
      used_at: data.used_at || null,
      expires_at: data.expires_at || null,
      created_at: data.created_at || null,
      source: data.source || null
    };
  });

  const merged = [...newCoupons, ...legacyCoupons].map((coupon) => ({
    ...coupon,
    type: coupon.discount_type === 'fixed' ? 'fixed' : 'percentage',
    value: coupon.discount_value
  }));

  merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return merged;
}

/** Validate coupon by code and checkout context. Returns evaluation if valid, null otherwise. */
export async function validateCoupon(input = {}) {
  const {
    code,
    userId = null,
    customerEmail = null,
    items = [],
    orderSubtotal = 0
  } = input || {};

  const coupon = await getCouponByCode(code);
  if (!coupon) return null;

  let actorRedemptionsCount = 0;
  if (coupon.source_collection === COUPONS_COLLECTION) {
    actorRedemptionsCount = await getRedemptionsForActor(coupon.id, {
      userId,
      customerEmail
    });
  } else if (coupon.used_at) {
    actorRedemptionsCount = 1;
  }

  const evaluation = evaluateCoupon(coupon, {
    userId,
    customerEmail,
    items,
    orderSubtotal,
    actorRedemptionsCount
  });
  if (!evaluation.valid) return null;

  return {
    id: coupon.id,
    source_collection: coupon.source_collection,
    ...coupon,
    ...evaluation
  };
}

/** Mark coupon as used (legacy helper). Prefer transactional consumption from order flow. */
export async function markCouponUsed(couponId) {
  const legacyRef = db.collection(LEGACY_USER_COUPONS_COLLECTION).doc(String(couponId));
  const legacyDoc = await legacyRef.get();
  if (legacyDoc.exists) {
    const data = legacyDoc.data();
    if (data.used_at) return false;
    const now = nowIso();
    await legacyRef.update({ used_at: now, updated_at: now });
    return true;
  }

  const newRef = db.collection(COUPONS_COLLECTION).doc(String(couponId));
  const newDoc = await newRef.get();
  if (!newDoc.exists) return false;
  const now = nowIso();
  await newRef.update({
    redemptions_count: FieldValue.increment(1),
    used_at: now,
    updated_at: now
  });
  return true;
}

export async function consumeCouponInTransaction({
  transaction,
  code,
  userId = null,
  customerEmail = null,
  items = [],
  orderSubtotal = 0,
  orderId,
  requestMeta = {}
}) {
  const coupon = await getCouponByCode(code, transaction);
  if (!coupon) {
    throw new Error('Coupon not found');
  }

  let actorRedemptionsCount = 0;
  if (coupon.source_collection === COUPONS_COLLECTION) {
    actorRedemptionsCount = await getRedemptionsForActor(coupon.id, { userId, customerEmail }, transaction);
  } else if (coupon.used_at) {
    actorRedemptionsCount = 1;
  }

  const evaluation = evaluateCoupon(coupon, {
    userId,
    customerEmail,
    items,
    orderSubtotal,
    actorRedemptionsCount
  });
  if (!evaluation.valid) {
    throw new Error(`Coupon rejected: ${evaluation.reason_code}`);
  }

  const redemptionRef = db.collection(COUPON_REDEMPTIONS_COLLECTION).doc();
  const now = nowIso();
  transaction.set(redemptionRef, {
    coupon_id: coupon.id,
    coupon_code: coupon.code,
    order_id: String(orderId),
    actor_user_id: userId ? String(userId) : null,
    actor_email: customerEmail ? normalizeEmail(customerEmail) : null,
    discount_amount: evaluation.discount_amount,
    ip: requestMeta.ip || null,
    user_agent: requestMeta.userAgent || null,
    created_at: now
  });

  if (coupon.source_collection === LEGACY_USER_COUPONS_COLLECTION) {
    const ref = db.collection(LEGACY_USER_COUPONS_COLLECTION).doc(String(coupon.id));
    transaction.update(ref, { used_at: now, updated_at: now });
  } else {
    const ref = db.collection(COUPONS_COLLECTION).doc(String(coupon.id));
    const updatePayload = {
      redemptions_count: FieldValue.increment(1),
      updated_at: now
    };
    if (coupon.usage_mode === 'single_use') {
      updatePayload.used_at = now;
      updatePayload.active = false;
    }
    transaction.update(ref, updatePayload);
  }

  return {
    coupon_id: coupon.id,
    coupon_code: coupon.code,
    discount_amount: evaluation.discount_amount,
    eligible_subtotal: evaluation.eligible_subtotal
  };
}
