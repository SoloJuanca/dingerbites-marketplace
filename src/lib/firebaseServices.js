import { db } from './firebaseAdmin';

const SERVICES_COLLECTION = 'services';
const SERVICE_CATEGORIES_COLLECTION = 'service_categories';
const SERVICE_REVIEWS_COLLECTION = 'service_reviews';

function toNum(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Get services with filters and pagination */
export async function getServices(options = {}) {
  const {
    category,
    level,
    minPrice,
    maxPrice,
    page = 1,
    limit = 8
  } = options;

  const snapshot = await db.collection(SERVICES_COLLECTION).get();
  let services = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  services = services.filter((s) => s.is_active !== false);

  if (category) {
    const catSnap = await db
      .collection(SERVICE_CATEGORIES_COLLECTION)
      .where('slug', '==', category)
      .limit(1)
      .get();
    const categoryId = catSnap.empty ? null : catSnap.docs[0].id;
    if (categoryId) {
      services = services.filter((s) => String(s.category_id) === categoryId);
    }
  }

  if (level) {
    const term = level.toLowerCase();
    services = services.filter((s) => (s.level || '').toLowerCase().includes(term));
  }

  if (minPrice != null) {
    services = services.filter((s) => toNum(s.price, 0) >= toNum(minPrice, 0));
  }
  if (maxPrice != null) {
    services = services.filter((s) => toNum(s.price, 0) <= toNum(maxPrice, Infinity));
  }

  services.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const total = services.length;
  const start = (page - 1) * limit;
  const paginated = services.slice(start, start + limit);

  const categoryIds = [...new Set(paginated.map((s) => s.category_id).filter(Boolean))];
  const categoryDocs = await Promise.all(
    categoryIds.map((id) => db.collection(SERVICE_CATEGORIES_COLLECTION).doc(String(id)).get())
  );
  const categoriesById = new Map(
    categoryDocs.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  const reviewCounts = await Promise.all(
    paginated.map(async (s) => {
      const revSnap = await db
        .collection(SERVICE_REVIEWS_COLLECTION)
        .where('service_id', '==', s.id)
        .where('is_approved', '==', true)
        .get();
      const ratings = revSnap.docs.map((d) => d.data().rating).filter((r) => r != null);
      const count = ratings.length;
      const avg = count ? ratings.reduce((a, b) => a + b, 0) / count : 0;
      return { id: s.id, review_count: count, average_rating: avg };
    })
  );
  const reviewByServiceId = new Map(reviewCounts.map((r) => [r.id, r]));

  const result = paginated.map((s) => {
    const cat = s.category_id ? categoriesById.get(String(s.category_id)) : null;
    const rev = reviewByServiceId.get(s.id);
    return {
      ...s,
      category_name: cat?.name ?? null,
      category_slug: cat?.slug ?? null,
      review_count: rev?.review_count ?? 0,
      average_rating: rev?.average_rating ?? 0
    };
  });

  return {
    services: result,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/** Create a new service */
export async function createService(payload) {
  const {
    name,
    description,
    short_description,
    image_url,
    category_id,
    duration,
    price,
    level,
    max_participants = 12
  } = payload;

  if (!name || !description || !price || !category_id) {
    throw new Error('Name, description, price, and category are required');
  }

  const categoryDoc = await db.collection(SERVICE_CATEGORIES_COLLECTION).doc(String(category_id)).get();
  if (!categoryDoc.exists) {
    throw new Error('Category not found');
  }

  const now = new Date().toISOString();
  const docRef = db.collection(SERVICES_COLLECTION).doc();
  const doc = {
    name,
    description,
    short_description: short_description || null,
    image_url: image_url || null,
    category_id: String(category_id),
    duration: duration || null,
    price: toNum(price, 0),
    level: level || null,
    max_participants: toNum(max_participants, 12),
    is_active: true,
    created_at: now,
    updated_at: now
  };
  await docRef.set(doc);
  return { id: docRef.id, ...doc };
}
