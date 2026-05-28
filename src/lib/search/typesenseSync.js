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

/**
 * Best-effort Typesense sync after admin or order updates.
 * Never throws — Firestore is already the source of truth.
 */
export async function syncProductToTypesenseSafe(productOrId, lookups) {
  try {
    let product = productOrId;
    if (typeof productOrId === 'string' || typeof productOrId === 'number') {
      const snap = await db.collection(PRODUCTS_COLLECTION).doc(String(productOrId)).get();
      if (!snap.exists) {
        return { skipped: true, reason: 'product_not_found' };
      }
      product = { id: snap.id, ...snap.data() };
    }

    return await indexProductToTypesense(product, lookups);
  } catch (error) {
    const productId =
      typeof productOrId === 'object' && productOrId?.id != null
        ? String(productOrId.id)
        : String(productOrId || '');
    console.error(`Failed to sync product ${productId} to Typesense:`, error);
    return { indexed: false, error: error?.message || 'sync_failed' };
  }
}

export async function deleteProductFromTypesense(productId) {
  if (!isTypesenseConfigured()) return { skipped: true, reason: 'typesense_not_configured' };
  if (!productId) return { skipped: true, reason: 'missing_product_id' };

  const client = getTypesenseServerClient();
  const { collectionName } = getTypesenseConfig();
  await client.collections(collectionName).documents(String(productId)).delete();
  return { deleted: true, id: String(productId) };
}

function uniqueProductIdsFromOrderItems(orderItems) {
  const ids = new Set();
  for (const line of orderItems || []) {
    const productId = line?.product_id ? String(line.product_id) : '';
    if (productId) ids.add(productId);
  }
  return [...ids];
}

/**
 * Re-index products in Typesense after stock changes from a completed order.
 * Best-effort: order creation must not depend on search sync succeeding.
 */
export async function syncOrderProductsToTypesense(orderItems) {
  if (!isTypesenseConfigured()) {
    return { skipped: true, reason: 'typesense_not_configured' };
  }

  const productIds = uniqueProductIdsFromOrderItems(orderItems);
  if (productIds.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const lookups = await loadTaxonomyLookups();
  const snapshots = await Promise.all(
    productIds.map((productId) => db.collection(PRODUCTS_COLLECTION).doc(productId).get())
  );

  const results = await Promise.all(
    snapshots
      .filter((snap) => snap.exists)
      .map((snap) => syncProductToTypesenseSafe({ id: snap.id, ...snap.data() }, lookups))
  );

  const failed = results.filter((result) => result.indexed === false && result.error).length;
  if (failed > 0) {
    console.error(
      `Typesense stock sync after order failed for ${failed}/${results.length} product(s)`
    );
  }

  return { synced: results.length - failed, failed };
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
