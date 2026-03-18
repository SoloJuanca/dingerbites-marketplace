import { db } from './firebaseAdmin';

const PRODUCTS_COLLECTION = 'products';
const SERVICES_COLLECTION = 'services';

export const DELIVERY_SHIPPING_AMOUNT = 120;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function normalizeQuantity(value) {
  const qty = Math.floor(toNumber(value, 1));
  return qty > 0 ? qty : 1;
}

export function resolveShippingAmount(shippingMethod) {
  return shippingMethod === 'Envío a domicilio' ? DELIVERY_SHIPPING_AMOUNT : 0;
}

export async function buildPricedOrderItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const normalizedItems = items.map((item) => ({
    product_id: item?.product_id ? String(item.product_id) : null,
    quantity: normalizeQuantity(item?.quantity)
  }));

  const productIds = [...new Set(normalizedItems.map((item) => item.product_id).filter(Boolean))];
  const productDocs = await Promise.all(
    productIds.map((productId) => db.collection(PRODUCTS_COLLECTION).doc(String(productId)).get())
  );
  const productsById = new Map(
    productDocs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, doc.data()])
  );

  const pricedItems = [];
  for (const item of normalizedItems) {
    if (!item.product_id) {
      throw new Error('Each order item requires product_id');
    }
    const product = productsById.get(item.product_id);
    if (!product) {
      throw new Error(`Product not found: ${item.product_id}`);
    }
    if (product.is_active === false) {
      throw new Error(`Product is inactive: ${item.product_id}`);
    }

    const unitPrice = roundMoney(toNumber(product.price, 0));
    const quantity = normalizeQuantity(item.quantity);
    pricedItems.push({
      product_id: item.product_id,
      product_variant_id: null,
      product_name: product.name || 'Producto',
      product_sku: product.sku || null,
      quantity,
      unit_price: unitPrice,
      total_price: roundMoney(unitPrice * quantity),
      category_id: product.category_id || null,
      subcategory_id: product.subcategory_id || null,
      brand_id: product.brand_id || null,
      manufacturer_brand_id: product.manufacturer_brand_id || null,
      franchise_brand_id: product.franchise_brand_id || null
    });
  }

  return pricedItems;
}

export async function buildPricedServiceItems(serviceItems = []) {
  if (!Array.isArray(serviceItems) || serviceItems.length === 0) return [];

  const normalized = serviceItems.map((item) => ({
    service_id: item?.service_id ? String(item.service_id) : null,
    schedule_id: item?.schedule_id || null,
    quantity: normalizeQuantity(item?.quantity)
  }));

  const serviceIds = [...new Set(normalized.map((item) => item.service_id).filter(Boolean))];
  const serviceDocs = await Promise.all(
    serviceIds.map((serviceId) => db.collection(SERVICES_COLLECTION).doc(String(serviceId)).get())
  );
  const servicesById = new Map(
    serviceDocs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, doc.data()])
  );

  const pricedItems = [];
  for (const item of normalized) {
    if (!item.service_id) {
      throw new Error('Each service item requires service_id');
    }
    const service = servicesById.get(item.service_id);
    if (!service) {
      throw new Error(`Service not found: ${item.service_id}`);
    }

    const unitPrice = roundMoney(toNumber(service.price, 0));
    const quantity = normalizeQuantity(item.quantity);
    pricedItems.push({
      service_id: item.service_id,
      service_schedule_id: item.schedule_id,
      service_name: service.name || 'Servicio',
      quantity,
      unit_price: unitPrice,
      total_price: roundMoney(unitPrice * quantity)
    });
  }

  return pricedItems;
}

export function computeSubtotal(pricedItems = [], pricedServiceItems = []) {
  const itemsSubtotal = pricedItems.reduce((sum, item) => sum + roundMoney(item.total_price), 0);
  const serviceSubtotal = pricedServiceItems.reduce((sum, item) => sum + roundMoney(item.total_price), 0);
  return roundMoney(itemsSubtotal + serviceSubtotal);
}

export function computeOrderTotals({
  subtotal = 0,
  shippingMethod = 'Envío a domicilio',
  discountAmount = 0
}) {
  const safeSubtotal = roundMoney(subtotal);
  const shippingAmount = roundMoney(resolveShippingAmount(shippingMethod));
  const safeDiscount = Math.min(roundMoney(discountAmount), safeSubtotal);
  const totalAmount = roundMoney(safeSubtotal + shippingAmount - safeDiscount);

  return {
    subtotal: safeSubtotal,
    tax_amount: 0,
    shipping_amount: shippingAmount,
    discount_amount: safeDiscount,
    total_amount: totalAmount
  };
}
