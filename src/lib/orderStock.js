import { db } from './firebaseAdmin';

const PRODUCTS_COLLECTION = 'products';

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Aggregate line quantities by product_id (order items from buildPricedOrderItems).
 */
function quantitiesByProductId(orderItems) {
  const map = new Map();
  for (const line of orderItems || []) {
    const pid = line?.product_id ? String(line.product_id) : null;
    if (!pid) continue;
    const q = Math.max(0, Math.floor(toNum(line.quantity, 0)));
    if (q <= 0) continue;
    map.set(pid, (map.get(pid) || 0) + q);
  }
  return map;
}

/**
 * Validates stock and decrements product stock inside an existing Firestore transaction.
 * Call after coupon logic and before writing the order document.
 *
 * @param {import('firebase-admin/firestore').Transaction} transaction
 * @param {Array<{ product_id: string, quantity: number, product_name?: string }>} orderItems
 * @param {string} nowIso - ISO timestamp for product updated_at
 */
export async function deductProductStockInTransaction(transaction, orderItems, nowIso) {
  const byProduct = quantitiesByProductId(orderItems);
  if (byProduct.size === 0) return;

  for (const [productId, requestedQty] of byProduct.entries()) {
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const doc = await transaction.get(productRef);

    if (!doc.exists) {
      const err = new Error(`Producto no encontrado: ${productId}`);
      err.code = 'PRODUCT_NOT_FOUND';
      err.details = { productId, requested: requestedQty, available: 0 };
      throw err;
    }

    const data = doc.data();
    const name = data.name || productId;

    if (data.is_active === false) {
      const err = new Error(`El producto "${name}" ya no está disponible.`);
      err.code = 'INSUFFICIENT_STOCK';
      err.details = {
        productId,
        productName: name,
        requested: requestedQty,
        available: 0
      };
      throw err;
    }

    const available = Math.max(0, Math.floor(toNum(data.stock_quantity, 0)));

    if (available < requestedQty) {
      const err = new Error(
        `Stock insuficiente para "${name}". Disponible: ${available}, solicitado: ${requestedQty}.`
      );
      err.code = 'INSUFFICIENT_STOCK';
      err.details = {
        productId,
        productName: name,
        requested: requestedQty,
        available
      };
      throw err;
    }

    const nextStock = available - requestedQty;
    transaction.update(productRef, {
      stock_quantity: nextStock,
      updated_at: nowIso
    });
  }
}

/**
 * Best-effort stock check before creating a PaymentIntent (does not replace transactional deduct on order).
 */
export async function assertStockAvailableForOrderItems(orderItems) {
  const byProduct = quantitiesByProductId(orderItems);
  if (byProduct.size === 0) return;

  for (const [productId, requestedQty] of byProduct.entries()) {
    const doc = await db.collection(PRODUCTS_COLLECTION).doc(productId).get();

    if (!doc.exists) {
      const err = new Error(`Producto no encontrado: ${productId}`);
      err.code = 'PRODUCT_NOT_FOUND';
      err.details = { productId, requested: requestedQty, available: 0 };
      throw err;
    }

    const data = doc.data();
    const name = data.name || productId;

    if (data.is_active === false) {
      const err = new Error(`El producto "${name}" ya no está disponible.`);
      err.code = 'INSUFFICIENT_STOCK';
      err.details = {
        productId,
        productName: name,
        requested: requestedQty,
        available: 0
      };
      throw err;
    }

    const available = Math.max(0, Math.floor(toNum(data.stock_quantity, 0)));

    if (available < requestedQty) {
      const err = new Error(
        `Stock insuficiente para "${name}". Disponible: ${available}, solicitado: ${requestedQty}.`
      );
      err.code = 'INSUFFICIENT_STOCK';
      err.details = {
        productId,
        productName: name,
        requested: requestedQty,
        available
      };
      throw err;
    }
  }
}
