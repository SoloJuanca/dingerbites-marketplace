import { db } from './firebaseAdmin';

const CART_ITEMS_COLLECTION = 'cart_items';
const PRODUCTS_COLLECTION = 'products';

function toNum(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Get cart items for user or session */
export async function getCartItems(userId, sessionId) {
  if (!userId && !sessionId) return { items: [], totalItems: 0, totalPrice: 0 };

  let q = db.collection(CART_ITEMS_COLLECTION);
  if (userId) {
    q = q.where('user_id', '==', String(userId));
  } else {
    q = q.where('session_id', '==', String(sessionId));
  }
  const snapshot = await q.get();
  const cartDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const productIds = [...new Set(cartDocs.map((c) => c.product_id).filter(Boolean))];
  const productSnaps = await Promise.all(productIds.map((id) => db.collection(PRODUCTS_COLLECTION).doc(String(id)).get()));
  const productsById = new Map(
    productSnaps.filter((s) => s.exists).map((s) => [s.id, s.data()])
  );

  const items = [];
  for (const row of cartDocs) {
    const product = row.product_id ? productsById.get(String(row.product_id)) : null;
    if (product && product.is_active === false) continue;
    const price = toNum(row.variant_price) || toNum(product?.price, 0);
    const imageUrl = product?.image || (Array.isArray(product?.images) && product.images[0] ? (product.images[0].url || product.images[0]) : '') || '';
    items.push({
      id: row.id,
      quantity: row.quantity,
      created_at: row.created_at,
      product_id: row.product_id,
      name: product?.name,
      slug: product?.slug,
      price: toNum(product?.price, 0),
      stock_quantity: toNum(product?.stock_quantity, 0),
      image_url: imageUrl,
      variant_id: row.product_variant_id || null,
      variant_name: row.variant_name || null,
      variant_price: row.variant_price != null ? toNum(row.variant_price) : null
    });
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const p = i.variant_price != null ? i.variant_price : i.price;
    return sum + p * i.quantity;
  }, 0);

  return { items, totalItems, totalPrice };
}

/** Add item to cart (upsert by user_id/session_id + product_id + variant) */
export async function addCartItem({ userId, sessionId, productId, variantId, quantity }) {
  const productRef = db.collection(PRODUCTS_COLLECTION).doc(String(productId));
  const productSnap = await productRef.get();
  if (!productSnap.exists) return null;
  const product = productSnap.data();
  if (product.is_active === false) return null;
  const stock = toNum(product.stock_quantity, 0);
  if (stock < quantity) return null;

  const variantIdStr = variantId ? String(variantId) : null;
  let existingQuery = db.collection(CART_ITEMS_COLLECTION).where('product_id', '==', String(productId));
  if (userId) {
    existingQuery = existingQuery.where('user_id', '==', String(userId));
  } else {
    existingQuery = existingQuery.where('session_id', '==', String(sessionId));
  }
  const existing = await existingQuery.get();
  const now = new Date().toISOString();

  const matchingDoc = existing.docs.find((d) => {
    const v = d.data().product_variant_id;
    return String(v || '') === String(variantIdStr || '');
  });

  if (matchingDoc) {
    const docRef = matchingDoc.ref;
    const current = matchingDoc.data();
    const newQty = (current.quantity || 0) + quantity;
    await docRef.update({ quantity: newQty, updated_at: now });
    return { id: docRef.id, quantity: newQty };
  }

  const docRef = db.collection(CART_ITEMS_COLLECTION).doc();
  await docRef.set({
    user_id: userId || null,
    session_id: sessionId || null,
    product_id: String(productId),
    product_variant_id: variantIdStr,
    quantity,
    created_at: now,
    updated_at: now
  });
  return { id: docRef.id, quantity };
}

/** Update cart item quantity (or remove if quantity <= 0) */
export async function updateCartItemQuantity(cartItemId, quantity, userId, sessionId) {
  const docRef = db.collection(CART_ITEMS_COLLECTION).doc(String(cartItemId));
  const doc = await docRef.get();
  if (!doc.exists) return null;
  const data = doc.data();
  const matches = (userId && String(data.user_id) === String(userId)) || (sessionId && String(data.session_id) === String(sessionId));
  if (!matches) return null;

  if (quantity <= 0) {
    await docRef.delete();
    return { id: cartItemId, quantity: 0, removed: true };
  }
  await docRef.update({ quantity, updated_at: new Date().toISOString() });
  const updated = await docRef.get();
  return { id: updated.id, quantity: updated.data().quantity };
}

/** Remove one cart item */
export async function removeCartItem(cartItemId, userId, sessionId) {
  const docRef = db.collection(CART_ITEMS_COLLECTION).doc(String(cartItemId));
  const doc = await docRef.get();
  if (!doc.exists) return false;
  const data = doc.data();
  const matches = (userId && String(data.user_id) === String(userId)) || (sessionId && String(data.session_id) === String(sessionId));
  if (!matches) return false;
  await docRef.delete();
  return true;
}

/** Clear entire cart for user or session */
export async function clearCart(userId, sessionId) {
  let q = db.collection(CART_ITEMS_COLLECTION);
  if (userId) q = q.where('user_id', '==', String(userId));
  else if (sessionId) q = q.where('session_id', '==', String(sessionId));
  else return;
  const snapshot = await q.get();
  const batch = db.batch();
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
