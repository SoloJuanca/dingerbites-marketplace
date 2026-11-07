import crypto from 'crypto';

const SYNC_SECRET = process.env.INTERNAL_SYNC_SECRET || '';
const MARKETPLACE_SYNC_URL = process.env.MARKETPLACE_SYNC_URL || '';
const PRODUCTS_COLLECTION = 'products';

async function getFirestoreDb() {
  const { db } = await import('../firebaseAdmin.js');
  return db;
}

const TCG_CONDITIONS = new Set(['NM', 'LP', 'MP', 'HP', 'DM', 'SEALED', 'OPENED']);

function mapEcommerceCondition(condition) {
  const normalized = String(condition || '').toUpperCase();
  if (TCG_CONDITIONS.has(normalized)) {
    return normalized;
  }

  const map = {
    'nuevo sellado': 'SEALED',
    'nuevo abierto': 'OPENED',
    'segunda mano': 'LP'
  };
  return map[String(condition || '').toLowerCase()] || 'NM';
}

function mapTcgFinish(subTypeName) {
  const value = String(subTypeName || '').toLowerCase();
  if (value.includes('reverse')) return 'reverse_holo';
  if (value.includes('holo') || value.includes('foil')) return 'foil';
  return 'normal';
}

function buildSyncPayload(product) {
  const tcgProductId = product?.tcg_product_id;
  if (tcgProductId == null) {
    return null;
  }

  return {
    action: 'upsert',
    tcg_product_id: tcgProductId,
    quantity: Number(product.stock_quantity) || 0,
    price: Number(product.price) || 0,
    condition: mapEcommerceCondition(product.condition),
    language: String(product.tcg_language || product.language || 'EN').toUpperCase().slice(0, 2),
    finish: mapTcgFinish(product.tcg_sub_type_name),
    name: product.name || '',
    image_url: product.image || product.images?.[0]?.url || null,
    tcg_category_id: product.tcg_category_id ?? null,
    tcg_group_id: product.tcg_group_id ?? null,
    tcg_category_name: product.tcg_category_name ?? null,
    tcg_group_name: product.tcg_group_name ?? null,
    tcg_sub_type_name: product.tcg_sub_type_name ?? null
  };
}

export function signSyncPayload({ idempotencyKey, body }) {
  const timestamp = String(Date.now());
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', SYNC_SECRET)
    .update(`${timestamp}.${idempotencyKey}.${rawBody}`)
    .digest('hex');

  return {
    headers: {
      'Content-Type': 'application/json',
      'x-sync-timestamp': timestamp,
      'x-sync-signature': signature,
      'x-idempotency-key': idempotencyKey
    },
    body: rawBody
  };
}

async function postMarketplaceSync(payload, idempotencyKey, attempt = 1) {
  const signed = signSyncPayload({ idempotencyKey, body: payload });

  try {
    const res = await fetch(MARKETPLACE_SYNC_URL, {
      method: 'POST',
      headers: signed.headers,
      body: signed.body
    });
    const data = await res.json().catch(async () => {
      const text = await res.text().catch(() => '');
      return { raw: text.slice(0, 200) };
    });

    if (!res.ok && attempt < 3 && (res.status >= 500 || res.status === 404 || res.status === 429)) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      return postMarketplaceSync(payload, idempotencyKey, attempt + 1);
    }

    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      return postMarketplaceSync(payload, idempotencyKey, attempt + 1);
    }
    throw error;
  }
}

/**
 * Push TCG stock snapshot to marketplace.
 */
export async function syncTcgStockToMarketplace(product, options = {}) {
  if (!MARKETPLACE_SYNC_URL || !SYNC_SECRET) {
    return { skipped: true, reason: 'sync_not_configured' };
  }

  const payload = buildSyncPayload(product);
  if (!payload) {
    return { skipped: true, reason: 'not_tcg_product' };
  }

  const idempotencyKey = options.idempotencyKey
    || `ecom-upsert-${payload.tcg_product_id}-${payload.quantity}-${Date.now()}`;

  try {
    const result = await postMarketplaceSync(payload, idempotencyKey);
    if (!result.ok) {
      console.error('Marketplace sync rejected:', result.status, result.data);
    }
    return result;
  } catch (error) {
    console.error('Marketplace sync failed:', error);
    return { error: error.message };
  }
}

/**
 * Sync marketplace stock after ecommerce order deductions.
 */
export async function syncOrderItemsToMarketplace(orderItems = []) {
  if (!MARKETPLACE_SYNC_URL || !SYNC_SECRET || !Array.isArray(orderItems)) {
    return { skipped: true, reason: 'sync_not_configured' };
  }

  const db = await getFirestoreDb();
  const productIds = [...new Set(
    orderItems
      .map((item) => item?.product_id || item?.productId)
      .filter(Boolean)
      .map(String)
  )];

  if (productIds.length === 0) {
    return { skipped: true, reason: 'no_products' };
  }

  const results = [];
  for (const productId of productIds) {
    const snap = await db.collection(PRODUCTS_COLLECTION).doc(productId).get();
    if (!snap.exists) continue;

    const product = { id: snap.id, ...snap.data() };
    if (product.tcg_product_id == null) continue;

    const syncResult = await syncTcgStockToMarketplace(product, {
      idempotencyKey: `ecom-order-${productId}-${product.stock_quantity}`
    });
    results.push({ productId, ...syncResult });
  }

  return { synced: results.length, results };
}

/**
 * Backfill all TCG products from Firestore to marketplace.
 */
export async function syncAllTcgStockToMarketplace({ activeOnly = true, limit = null } = {}) {
  if (!MARKETPLACE_SYNC_URL || !SYNC_SECRET) {
    return { skipped: true, reason: 'sync_not_configured' };
  }

  const db = await getFirestoreDb();
  const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
  let products = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((product) => product.tcg_product_id != null)
    .filter((product) => !activeOnly || product.is_active !== false);

  if (Number.isFinite(limit) && limit > 0) {
    products = products.slice(0, limit);
  }

  const results = [];
  for (const product of products) {
    const syncResult = await syncTcgStockToMarketplace(product, {
      idempotencyKey: `ecom-backfill-${product.id}`
    });
    results.push({
      productId: product.id,
      tcg_product_id: product.tcg_product_id,
      ok: syncResult.ok !== false && !syncResult.error && !syncResult.skipped,
      status: syncResult.status,
      error: syncResult.error || syncResult.data?.error || syncResult.data?.details || null
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const synced = results.filter((item) => item.ok).length;
  const failed = results.length - synced;

  return {
    total: products.length,
    synced,
    failed,
    results
  };
}
