import { randomUUID } from 'crypto';
import { db } from './firebaseAdmin';

const USER_COUPONS_COLLECTION = 'user_coupons';
const FIRST_REVIEW_SOURCE = 'FIRST_REVIEW';

/** Generate unique coupon code */
function generateCouponCode() {
  const suffix = randomUUID().slice(0, 8).toUpperCase().replace(/-/g, '');
  return `RESENA5-${suffix}`;
}

/** Check if user already has a FIRST_REVIEW coupon (used or not) */
export async function userHasFirstReviewCoupon(userId) {
  if (!userId) return false;
  const snapshot = await db
    .collection(USER_COUPONS_COLLECTION)
    .where('user_id', '==', String(userId))
    .where('source', '==', FIRST_REVIEW_SOURCE)
    .limit(1)
    .get();
  return !snapshot.empty;
}

/** Create a coupon for user (e.g. 5% from review signup). Returns null if user already has FIRST_REVIEW. */
export async function createFirstReviewCoupon(userId) {
  if (!userId) throw new Error('User ID is required');

  const alreadyHas = await userHasFirstReviewCoupon(userId);
  if (alreadyHas) {
    return null; // User already received FIRST_REVIEW coupon
  }

  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const docRef = db.collection(USER_COUPONS_COLLECTION).doc();
  const code = generateCouponCode();
  await docRef.set({
    user_id: String(userId),
    code,
    type: 'percentage',
    value: 5,
    used_at: null,
    expires_at: expiresAt.toISOString(),
    created_at: now,
    source: FIRST_REVIEW_SOURCE
  });

  const doc = await docRef.get();
  return { id: doc.id, ...doc.data() };
}

/** Get coupons for a user */
export async function getCouponsByUserId(userId) {
  if (!userId) return [];
  const snapshot = await db
    .collection(USER_COUPONS_COLLECTION)
    .where('user_id', '==', String(userId))
    .get();
  const coupons = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  coupons.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return coupons;
}

/** Validate coupon by code. Returns coupon if valid, null otherwise. */
export async function validateCoupon(code, userId = null, subtotal = 0) {
  if (!code || typeof code !== 'string') return null;
  const normalizedCode = code.trim().toUpperCase();

  const snapshot = await db
    .collection(USER_COUPONS_COLLECTION)
    .where('code', '==', normalizedCode)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const coupon = doc.data();

  if (coupon.used_at) return null;
  const expiresAt = coupon.expires_at ? new Date(coupon.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) return null;

  // If userId provided, ensure coupon belongs to user
  if (userId && String(coupon.user_id) !== String(userId)) return null;

  const discountAmount =
    coupon.type === 'percentage'
      ? (subtotal * (coupon.value || 0)) / 100
      : Math.min(coupon.value || 0, subtotal);

  return {
    id: doc.id,
    ...coupon,
    discount_amount: discountAmount
  };
}

/** Mark coupon as used */
export async function markCouponUsed(couponId) {
  const ref = db.collection(USER_COUPONS_COLLECTION).doc(String(couponId));
  const doc = await ref.get();
  if (!doc.exists) return false;
  const data = doc.data();
  if (data.used_at) return false;
  const now = new Date().toISOString();
  await ref.update({ used_at: now });
  return true;
}
