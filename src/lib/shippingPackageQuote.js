import { db } from './firebaseAdmin';
import { createShippingPackagePlanForItems } from './shippingPackageSizes';

const PRODUCTS_COLLECTION = 'products';

export async function buildShippingPackagePlanForItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Agrega productos al carrito antes de cotizar el envío.');
    error.code = 'SHIPPING_ITEMS_REQUIRED';
    throw error;
  }

  const normalizedItems = items.map((item) => ({
    productId: String(item?.product_id || item?.id || ''),
    quantity: Math.floor(Number(item?.quantity))
  }));
  if (normalizedItems.some(({ productId, quantity }) => !productId || !Number.isFinite(quantity) || quantity < 1)) {
    const error = new Error('Los productos del carrito no son válidos para cotizar el envío.');
    error.code = 'SHIPPING_ITEMS_INVALID';
    throw error;
  }

  const productIds = [...new Set(normalizedItems.map(({ productId }) => productId))];
  const productDocs = await Promise.all(
    productIds.map((productId) => db.collection(PRODUCTS_COLLECTION).doc(productId).get())
  );
  const productsById = new Map(
    productDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()])
  );

  return createShippingPackagePlanForItems(normalizedItems, productsById);
}
