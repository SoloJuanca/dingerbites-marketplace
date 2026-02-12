import { db } from './firebaseAdmin';

const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';
const PRODUCTS_COLLECTION = 'products';

function normalizeDoc(id, payload) {
  return {
    id,
    ...payload
  };
}

async function listCollection(collectionName, { page = 1, limit = 20, onlyActive = false, orderBy = 'name' } = {}) {
  const snapshot = await db.collection(collectionName).get();

  let items = snapshot.docs.map((doc) => normalizeDoc(doc.id, doc.data()));

  if (onlyActive) {
    items = items.filter((item) => item.is_active !== false);
  }

  items.sort((a, b) => {
    if (orderBy === 'sort_order') {
      const sortOrderA = Number(a.sort_order || 0);
      const sortOrderB = Number(b.sort_order || 0);
      if (sortOrderA !== sortOrderB) {
        return sortOrderA - sortOrderB;
      }
    }

    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const total = items.length;
  const totalPages = Math.ceil(total / safeLimit);
  const start = (safePage - 1) * safeLimit;
  const paginatedItems = items.slice(start, start + safeLimit);

  return {
    items: paginatedItems,
    pagination: {
      total,
      totalPages,
      currentPage: safePage,
      hasNextPage: totalPages > 0 && safePage < totalPages,
      hasPrevPage: safePage > 1
    }
  };
}

async function findBySlug(collectionName, slug) {
  const snapshot = await db.collection(collectionName).where('slug', '==', slug).limit(1).get();
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return normalizeDoc(doc.id, doc.data());
}

async function findBySlugExcludingId(collectionName, slug, id) {
  const snapshot = await db.collection(collectionName).where('slug', '==', slug).get();
  const matchingDoc = snapshot.docs.find((doc) => doc.id !== id);
  return matchingDoc ? normalizeDoc(matchingDoc.id, matchingDoc.data()) : null;
}

async function getById(collectionName, id) {
  const doc = await db.collection(collectionName).doc(id).get();
  if (!doc.exists) {
    return null;
  }
  return normalizeDoc(doc.id, doc.data());
}

async function createCategory(category) {
  const docRef = db.collection(CATEGORIES_COLLECTION).doc();
  const payload = {
    name: category.name,
    slug: category.slug,
    description: category.description || null,
    image_url: category.image_url || null,
    is_active: category.is_active !== undefined ? Boolean(category.is_active) : true,
    sort_order: Number.isFinite(Number(category.sort_order)) ? Number(category.sort_order) : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await docRef.set(payload);
  return normalizeDoc(docRef.id, payload);
}

async function createBrand(brand) {
  const docRef = db.collection(BRANDS_COLLECTION).doc();
  const payload = {
    name: brand.name,
    slug: brand.slug,
    description: brand.description || null,
    logo_url: brand.logo_url || null,
    website_url: brand.website_url || null,
    is_active: brand.is_active !== undefined ? Boolean(brand.is_active) : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await docRef.set(payload);
  return normalizeDoc(docRef.id, payload);
}

async function updateById(collectionName, id, data) {
  const docRef = db.collection(collectionName).doc(id);
  const existingDoc = await docRef.get();
  if (!existingDoc.exists) {
    return null;
  }

  const payload = {
    ...data,
    updated_at: new Date().toISOString()
  };

  await docRef.update(payload);
  const updatedDoc = await docRef.get();
  return normalizeDoc(updatedDoc.id, updatedDoc.data());
}

async function deleteById(collectionName, id) {
  await db.collection(collectionName).doc(id).delete();
}

async function hasProductsWithCategoryId(categoryId) {
  const snapshot = await db
    .collection(PRODUCTS_COLLECTION)
    .where('category_id', '==', categoryId)
    .limit(1)
    .get();

  return !snapshot.empty;
}

async function hasProductsWithBrandId(brandId) {
  const snapshot = await db
    .collection(PRODUCTS_COLLECTION)
    .where('brand_id', '==', brandId)
    .limit(1)
    .get();

  return !snapshot.empty;
}

export {
  CATEGORIES_COLLECTION,
  BRANDS_COLLECTION,
  listCollection,
  findBySlug,
  findBySlugExcludingId,
  getById,
  createCategory,
  createBrand,
  updateById,
  deleteById,
  hasProductsWithCategoryId,
  hasProductsWithBrandId
};
