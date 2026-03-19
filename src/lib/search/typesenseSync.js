import { db } from '../firebaseAdmin';
import { getTypesenseConfig, getTypesenseServerClient, isTypesenseConfigured } from '../typesenseServer';
import { mapProductToTypesense } from './mapProductToTypesense';

const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';
const PRODUCTS_COLLECTION = 'products';

export async function loadTaxonomyLookups() {
  const [categorySnapshot, brandSnapshot] = await Promise.all([
    db.collection(CATEGORIES_COLLECTION).get(),
    db.collection(BRANDS_COLLECTION).get()
  ]);

  const categoriesById = new Map();
  categorySnapshot.docs.forEach((doc) => {
    categoriesById.set(doc.id, { ...doc.data(), id: doc.id });
  });

  const brandsById = new Map();
  brandSnapshot.docs.forEach((doc) => {
    brandsById.set(doc.id, { ...doc.data(), id: doc.id });
  });

  return { categoriesById, brandsById };
}

export async function indexProductToTypesense(product, lookups) {
  if (!isTypesenseConfigured()) return { skipped: true, reason: 'typesense_not_configured' };
  if (!product?.id) return { skipped: true, reason: 'missing_product_id' };

  const client = getTypesenseServerClient();
  const { collectionName } = getTypesenseConfig();
  const resolvedLookups = lookups || (await loadTaxonomyLookups());
  const document = mapProductToTypesense(product, resolvedLookups);

  await client.collections(collectionName).documents().upsert(document);
  return { indexed: true, id: document.id };
}

export async function deleteProductFromTypesense(productId) {
  if (!isTypesenseConfigured()) return { skipped: true, reason: 'typesense_not_configured' };
  if (!productId) return { skipped: true, reason: 'missing_product_id' };

  const client = getTypesenseServerClient();
  const { collectionName } = getTypesenseConfig();
  await client.collections(collectionName).documents(String(productId)).delete();
  return { deleted: true, id: String(productId) };
}

export async function reindexAllProducts(batchSize = 250) {
  if (!isTypesenseConfigured()) return { skipped: true, reason: 'typesense_not_configured' };

  const client = getTypesenseServerClient();
  const { collectionName } = getTypesenseConfig();
  const lookups = await loadTaxonomyLookups();
  const productSnapshot = await db.collection(PRODUCTS_COLLECTION).get();
  const products = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  let indexed = 0;
  for (let offset = 0; offset < products.length; offset += batchSize) {
    const batch = products.slice(offset, offset + batchSize);
    const payload = batch.map((product) => mapProductToTypesense(product, lookups));
    if (payload.length === 0) continue;
    await client
      .collections(collectionName)
      .documents()
      .import(payload, { action: 'upsert', dirty_values: 'coerce_or_drop' });
    indexed += payload.length;
  }

  return { indexed, total: products.length };
}
