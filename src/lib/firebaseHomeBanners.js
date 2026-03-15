import { db } from './firebaseAdmin';

export const HOME_BANNERS_COLLECTION = 'home_banners';

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBanner(id, payload) {
  return {
    id,
    title: payload.title || '',
    subtitle: payload.subtitle || '',
    image_url: payload.image_url || '',
    mobile_image_url: payload.mobile_image_url || '',
    cta_label: payload.cta_label || '',
    cta_url: payload.cta_url || '',
    is_active: payload.is_active !== false,
    sort_order: toNum(payload.sort_order, 0),
    starts_at: payload.starts_at || null,
    ends_at: payload.ends_at || null,
    created_at: payload.created_at || null,
    updated_at: payload.updated_at || null
  };
}

function isBannerInDateRange(banner, now = new Date()) {
  const start = banner.starts_at ? new Date(banner.starts_at) : null;
  const end = banner.ends_at ? new Date(banner.ends_at) : null;

  if (start && !Number.isNaN(start.getTime()) && now < start) {
    return false;
  }

  if (end && !Number.isNaN(end.getTime()) && now > end) {
    return false;
  }

  return true;
}

function sortBanners(a, b) {
  const sortOrderDiff = toNum(a.sort_order, 0) - toNum(b.sort_order, 0);
  if (sortOrderDiff !== 0) return sortOrderDiff;
  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
}

export async function listHomeBannersAdmin() {
  const snapshot = await db.collection(HOME_BANNERS_COLLECTION).get();
  const items = snapshot.docs.map((doc) => normalizeBanner(doc.id, doc.data()));
  return items.sort(sortBanners);
}

export async function listHomeBannersPublic() {
  const now = new Date();
  const banners = await listHomeBannersAdmin();
  return banners.filter((banner) => banner.is_active && isBannerInDateRange(banner, now));
}

export async function getHomeBannerById(id) {
  const doc = await db.collection(HOME_BANNERS_COLLECTION).doc(String(id)).get();
  if (!doc.exists) return null;
  return normalizeBanner(doc.id, doc.data());
}

export async function createHomeBanner(data) {
  const now = new Date().toISOString();
  const docRef = db.collection(HOME_BANNERS_COLLECTION).doc();
  const payload = {
    title: data.title || '',
    subtitle: data.subtitle || '',
    image_url: data.image_url || '',
    mobile_image_url: data.mobile_image_url || '',
    cta_label: data.cta_label || '',
    cta_url: data.cta_url || '',
    is_active: data.is_active !== false,
    sort_order: toNum(data.sort_order, 0),
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    created_at: now,
    updated_at: now
  };

  await docRef.set(payload);
  return normalizeBanner(docRef.id, payload);
}

export async function updateHomeBanner(id, data) {
  const docRef = db.collection(HOME_BANNERS_COLLECTION).doc(String(id));
  const existing = await docRef.get();
  if (!existing.exists) return null;

  const existingData = existing.data();
  const payload = {
    title: data.title ?? existingData.title ?? '',
    subtitle: data.subtitle ?? existingData.subtitle ?? '',
    image_url: data.image_url ?? existingData.image_url ?? '',
    mobile_image_url: data.mobile_image_url ?? existingData.mobile_image_url ?? '',
    cta_label: data.cta_label ?? existingData.cta_label ?? '',
    cta_url: data.cta_url ?? existingData.cta_url ?? '',
    is_active: data.is_active !== undefined ? Boolean(data.is_active) : existingData.is_active !== false,
    sort_order: data.sort_order !== undefined ? toNum(data.sort_order, 0) : toNum(existingData.sort_order, 0),
    starts_at: data.starts_at !== undefined ? (data.starts_at || null) : (existingData.starts_at || null),
    ends_at: data.ends_at !== undefined ? (data.ends_at || null) : (existingData.ends_at || null),
    updated_at: new Date().toISOString()
  };

  await docRef.update(payload);
  const updated = await docRef.get();
  return normalizeBanner(updated.id, updated.data());
}

export async function deleteHomeBanner(id) {
  await db.collection(HOME_BANNERS_COLLECTION).doc(String(id)).delete();
}
