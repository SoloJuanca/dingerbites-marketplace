import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';
import { TCG_CSV_BASE, tcgcsvHeaders } from './tcgcsvClient';
import { syncProductToTypesenseSafe } from './search/typesenseSync';

const PRODUCTS_COLLECTION = 'products';

const groupProductsCache = new Map();
const inFlightProductRefresh = new Map();
const GROUP_CACHE_TTL_MS = 10 * 60 * 1000;

function toStringId(value) {
  return value == null ? '' : String(value).trim();
}

function isHttpImageUrl(url) {
  const value = toStringId(url);
  if (!value) return false;
  if (value.includes('unsplash.com')) return false;
  return /^https?:\/\//i.test(value);
}

function isUsableTcgImageUrl(url) {
  const value = toStringId(url);
  if (!isHttpImageUrl(value)) return false;
  return value.includes('tcgplayer-cdn.tcgplayer.com');
}

function buildImagesArray(imageUrl, productName, existingImages = []) {
  const nextPrimary = {
    url: imageUrl,
    alt: productName || '',
    is_primary: true,
    sort_order: 0
  };

  if (!Array.isArray(existingImages) || existingImages.length === 0) {
    return [nextPrimary];
  }

  let replacedPrimary = false;
  const next = existingImages.map((img, index) => {
    const url = typeof img === 'string' ? img : img?.url || '';
    const isPrimary = typeof img === 'object' && img?.is_primary;
    if (isPrimary || (!replacedPrimary && index === 0)) {
      replacedPrimary = true;
      if (typeof img === 'string') return imageUrl;
      return {
        ...img,
        url: imageUrl,
        alt: img.alt || productName || '',
        is_primary: true,
        sort_order: img.sort_order ?? 0
      };
    }
    return img;
  });

  if (!replacedPrimary) next.unshift(nextPrimary);
  return next;
}

async function fetchTcgGroupProducts(categoryId, groupId) {
  const cat = toStringId(categoryId);
  const group = toStringId(groupId);
  const cacheKey = `${cat}:${group}`;
  const cached = groupProductsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < GROUP_CACHE_TTL_MS) {
    return cached.products;
  }

  const res = await fetch(
    `${TCG_CSV_BASE}/${encodeURIComponent(cat)}/${encodeURIComponent(group)}/products?getExtendedFields=true`,
    {
      headers: tcgcsvHeaders(),
      cache: 'no-store'
    }
  );

  if (!res.ok) {
    throw new Error(`TCG API error: ${res.status}`);
  }

  const data = await res.json();
  const products = Array.isArray(data?.results) ? data.results : [];
  groupProductsCache.set(cacheKey, { products, fetchedAt: Date.now() });
  return products;
}

function findTcgProductImageUrl(tcgProducts, tcgProductId) {
  const targetId = toStringId(tcgProductId);
  const match = (tcgProducts || []).find(
    (item) => toStringId(item?.productId) === targetId
  );
  return toStringId(match?.imageUrl);
}

export function productNeedsImageRefresh(product) {
  if (!product?.tcg_product_id) return false;
  return !isUsableTcgImageUrl(product.image);
}

/**
 * Refresh a single TCG product image from tcgcsv and persist to Firestore + Typesense.
 */
export async function refreshProductTcgImage(productId) {
  const id = toStringId(productId);
  if (!id) {
    return { refreshed: false, reason: 'missing_product_id' };
  }

  if (inFlightProductRefresh.has(id)) {
    return inFlightProductRefresh.get(id);
  }

  const promise = (async () => {
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(id);
    const snap = await productRef.get();
    if (!snap.exists) {
      return { refreshed: false, reason: 'product_not_found', status: 404 };
    }

    const product = { id: snap.id, ...snap.data() };
    const tcgProductId = product.tcg_product_id;
    const tcgCategoryId = product.tcg_category_id;
    const tcgGroupId = product.tcg_group_id;

    if (tcgProductId == null || tcgCategoryId == null || tcgGroupId == null) {
      return { refreshed: false, reason: 'not_tcg_product', status: 400 };
    }

    const tcgProducts = await fetchTcgGroupProducts(tcgCategoryId, tcgGroupId);
    const imageUrl = findTcgProductImageUrl(tcgProducts, tcgProductId);

    if (!isHttpImageUrl(imageUrl)) {
      return { refreshed: false, reason: 'no_image_from_api', image: product.image || '' };
    }

    const currentImage = toStringId(product.image);
    if (currentImage === imageUrl) {
      return { refreshed: false, reason: 'same_url', image: currentImage };
    }

    const images = buildImagesArray(imageUrl, product.name, product.images);
    const updateData = {
      image: imageUrl,
      images,
      updated_at: FieldValue.serverTimestamp()
    };

    await productRef.update(updateData);
    const updatedProduct = { ...product, image: imageUrl, images };
    await syncProductToTypesenseSafe(updatedProduct);

    return { refreshed: true, image: imageUrl, reason: 'updated' };
  })();

  inFlightProductRefresh.set(id, promise);
  try {
    return await promise;
  } finally {
    inFlightProductRefresh.delete(id);
  }
}

/**
 * Batch-refresh TCG products with missing/unusable images.
 * Groups by (categoryId, groupId) to minimize tcgcsv calls.
 */
export async function refreshTcgImagesBatch({ limit = 500 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 2000));
  const snapshot = await db.collection(PRODUCTS_COLLECTION).get();

  const candidates = [];
  snapshot.docs.forEach((doc) => {
    const product = { id: doc.id, ...doc.data() };
    if (!product.tcg_product_id || product.tcg_category_id == null || product.tcg_group_id == null) {
      return;
    }
    if (!productNeedsImageRefresh(product)) return;
    candidates.push(product);
  });

  const limited = candidates.slice(0, safeLimit);
  const byGroup = new Map();

  limited.forEach((product) => {
    const key = `${toStringId(product.tcg_category_id)}:${toStringId(product.tcg_group_id)}`;
    if (!byGroup.has(key)) {
      byGroup.set(key, {
        categoryId: product.tcg_category_id,
        groupId: product.tcg_group_id,
        products: []
      });
    }
    byGroup.get(key).products.push(product);
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const report = { updated: [], skipped: [], failed: [] };

  for (const group of byGroup.values()) {
    let tcgProducts = [];
    try {
      tcgProducts = await fetchTcgGroupProducts(group.categoryId, group.groupId);
    } catch (error) {
      group.products.forEach((product) => {
        failed += 1;
        report.failed.push({
          id: product.id,
          name: product.name,
          reason: error?.message || 'group_fetch_failed'
        });
      });
      continue;
    }

    for (const product of group.products) {
      try {
        const imageUrl = findTcgProductImageUrl(tcgProducts, product.tcg_product_id);
        if (!isHttpImageUrl(imageUrl)) {
          skipped += 1;
          report.skipped.push({
            id: product.id,
            name: product.name,
            reason: 'no_image_from_api'
          });
          continue;
        }

        if (toStringId(product.image) === imageUrl) {
          skipped += 1;
          report.skipped.push({
            id: product.id,
            name: product.name,
            reason: 'same_url'
          });
          continue;
        }

        const images = buildImagesArray(imageUrl, product.name, product.images);
        await db.collection(PRODUCTS_COLLECTION).doc(product.id).update({
          image: imageUrl,
          images,
          updated_at: FieldValue.serverTimestamp()
        });
        await syncProductToTypesenseSafe({ ...product, image: imageUrl, images });

        updated += 1;
        report.updated.push({ id: product.id, name: product.name, image: imageUrl });
      } catch (error) {
        failed += 1;
        report.failed.push({
          id: product.id,
          name: product.name,
          reason: error?.message || 'update_failed'
        });
      }
    }
  }

  return {
    success: true,
    scanned: snapshot.size,
    candidates: candidates.length,
    processed: limited.length,
    updated,
    skipped,
    failed,
    report
  };
}
