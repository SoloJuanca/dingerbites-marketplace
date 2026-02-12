import { db } from './firebaseAdmin';

const PRODUCT_REVIEWS_COLLECTION = 'product_reviews';
const SERVICE_REVIEWS_COLLECTION = 'service_reviews';
const USERS_COLLECTION = 'users';
const PRODUCTS_COLLECTION = 'products';
const SERVICES_COLLECTION = 'services';

/** Get reviews with filters (productId, serviceId, userId, rating, pagination) */
export async function getReviews(options = {}) {
  const { productId, serviceId, userId, rating, page = 1, limit = 10 } = options;

  let reviews = [];
  let total = 0;

  if (productId) {
    let q = db
      .collection(PRODUCT_REVIEWS_COLLECTION)
      .where('product_id', '==', String(productId))
      .where('is_approved', '==', true);
    const snapshot = await q.get();
    reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), review_type: 'product' }));
    total = reviews.length;
  } else if (serviceId) {
    let q = db
      .collection(SERVICE_REVIEWS_COLLECTION)
      .where('service_id', '==', String(serviceId))
      .where('is_approved', '==', true);
    const snapshot = await q.get();
    reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), review_type: 'service' }));
    total = reviews.length;
  } else {
    const [productSnap, serviceSnap] = await Promise.all([
      db.collection(PRODUCT_REVIEWS_COLLECTION).where('is_approved', '==', true).get(),
      db.collection(SERVICE_REVIEWS_COLLECTION).where('is_approved', '==', true).get()
    ]);
    const productReviews = productSnap.docs.map((d) => ({ id: d.id, ...d.data(), review_type: 'product' }));
    const serviceReviews = serviceSnap.docs.map((d) => ({ id: d.id, ...d.data(), review_type: 'service' }));
    reviews = [...productReviews, ...serviceReviews];
    total = reviews.length;
  }

  if (userId) {
    reviews = reviews.filter((r) => String(r.user_id) === String(userId));
    total = reviews.length;
  }
  if (rating) {
    const r = parseInt(rating, 10);
    if (!Number.isNaN(r)) {
      reviews = reviews.filter((rev) => rev.rating === r);
      total = reviews.length;
    }
  }

  reviews.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const start = (page - 1) * limit;
  const paginated = reviews.slice(start, start + limit);

  const userIds = [...new Set(paginated.map((r) => r.user_id).filter(Boolean))];
  const productIds = [...new Set(paginated.filter((r) => r.review_type === 'product').map((r) => r.product_id).filter(Boolean))];
  const serviceIds = [...new Set(paginated.filter((r) => r.review_type === 'service').map((r) => r.service_id).filter(Boolean))];

  const [userDocs, productDocs, serviceDocs] = await Promise.all([
    Promise.all(userIds.map((id) => db.collection(USERS_COLLECTION).doc(String(id)).get())),
    Promise.all(productIds.map((id) => db.collection(PRODUCTS_COLLECTION).doc(String(id)).get())),
    Promise.all(serviceIds.map((id) => db.collection(SERVICES_COLLECTION).doc(String(id)).get()))
  ]);
  const usersById = new Map(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const productsById = new Map(productDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const servicesById = new Map(serviceDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const enriched = paginated.map((r) => {
    const user = usersById.get(String(r.user_id));
    const first_name = user?.first_name ?? '';
    const last_name = user?.last_name ?? '';
    const email = user?.email ?? '';
    if (r.review_type === 'product') {
      const product = productsById.get(String(r.product_id));
      return {
        ...r,
        first_name,
        last_name,
        email,
        product_name: product?.name ?? null,
        product_slug: product?.slug ?? null
      };
    }
    const service = servicesById.get(String(r.service_id));
    return {
      ...r,
      first_name,
      last_name,
      email,
      service_name: service?.name ?? null,
      service_slug: service?.slug ?? null
    };
  });

  return {
    reviews: enriched,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  };
}

/** Create product or service review */
export async function createReview(payload) {
  const { userId, productId, serviceId, rating, title, comment } = payload;
  if (!userId || !rating || (!productId && !serviceId)) {
    throw new Error('User ID, rating, and product ID or service ID are required');
  }
  if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

  const userDoc = await db.collection(USERS_COLLECTION).doc(String(userId)).get();
  if (!userDoc.exists) throw new Error('User not found');

  const now = new Date().toISOString();

  if (productId) {
    const productDoc = await db.collection(PRODUCTS_COLLECTION).doc(String(productId)).get();
    if (!productDoc.exists) throw new Error('Product not found');
    const product = productDoc.data();
    if (product.is_active === false) throw new Error('Product not found');

    const existing = await db
      .collection(PRODUCT_REVIEWS_COLLECTION)
      .where('user_id', '==', String(userId))
      .where('product_id', '==', String(productId))
      .limit(1)
      .get();
    if (!existing.empty) throw new Error('You have already reviewed this product');

    const docRef = db.collection(PRODUCT_REVIEWS_COLLECTION).doc();
    await docRef.set({
      user_id: String(userId),
      product_id: String(productId),
      rating,
      title: title || null,
      comment: comment || null,
      is_approved: true,
      created_at: now,
      updated_at: now
    });
    const created = await docRef.get();
    return { id: created.id, rating, title: title || null, comment: comment || null, created_at: now };
  }

  const serviceDoc = await db.collection(SERVICES_COLLECTION).doc(String(serviceId)).get();
  if (!serviceDoc.exists) throw new Error('Service not found');
  const service = serviceDoc.data();
  if (service.is_active === false) throw new Error('Service not found');

  const existing = await db
    .collection(SERVICE_REVIEWS_COLLECTION)
    .where('user_id', '==', String(userId))
    .where('service_id', '==', String(serviceId))
    .limit(1)
    .get();
  if (!existing.empty) throw new Error('You have already reviewed this service');

  const docRef = db.collection(SERVICE_REVIEWS_COLLECTION).doc();
  await docRef.set({
    user_id: String(userId),
    service_id: String(serviceId),
    rating,
    title: title || null,
    comment: comment || null,
    is_approved: true,
    created_at: now,
    updated_at: now
  });
  const created = await docRef.get();
  return { id: created.id, rating, title: title || null, comment: comment || null, created_at: now };
}
