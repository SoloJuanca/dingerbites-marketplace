/**
 * Lightweight analytics helper for Dingerbites.
 *
 * Every tracking call pushes a GA4-shaped ecommerce event to BOTH:
 *  - the GTM `dataLayer` (so tags configured in GTM can consume it), and
 *  - `gtag()` directly (when a GA4 Measurement ID is configured).
 *
 * All functions are safe to call during SSR or before the scripts load
 * (they no-op when `window` is unavailable).
 */

const CURRENCY = 'MXN';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || '';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

/** Push a raw event object to the GTM dataLayer. */
function pushToDataLayer(payload) {
  if (!isBrowser()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

/** Send an event directly to GA4 via gtag (if configured/loaded). */
function sendToGtag(eventName, params) {
  if (!isBrowser() || typeof window.gtag !== 'function' || !GA_MEASUREMENT_ID) return;
  window.gtag('event', eventName, params);
}

/**
 * Core tracker: emits `eventName` to dataLayer + gtag.
 * `params` should already be in GA4 ecommerce shape.
 */
export function trackEvent(eventName, params = {}) {
  if (!eventName) return;
  // Clear the previous ecommerce object so events don't bleed together in GTM.
  if (params && params.ecommerce) {
    pushToDataLayer({ ecommerce: null });
  }
  pushToDataLayer({ event: eventName, ...params });
  // gtag expects the ecommerce fields flattened at the top level.
  const { ecommerce, ...rest } = params;
  sendToGtag(eventName, { ...rest, ...(ecommerce || {}) });
}

/**
 * Normalize a product/cart entry into a GA4 `item`.
 * Accepts loose shapes coming from products, cart items, or order lines.
 */
export function toGaItem(product = {}, extra = {}) {
  const price = toNumber(
    product.price ?? product.unit_price ?? product.cartPrice ?? product.total_price,
    0
  );
  const item = {
    item_id: String(product.id ?? product.product_id ?? product.slug ?? ''),
    item_name: product.name ?? product.product_name ?? 'Producto',
    price
  };
  if (product.category_name || product.category_id || product.category) {
    item.item_category = String(product.category_name ?? product.category ?? product.category_id);
  }
  if (product.brand_name || product.brand) {
    item.item_brand = String(product.brand_name ?? product.brand);
  }
  const quantity = product.quantity ?? extra.quantity;
  if (quantity !== undefined) {
    item.quantity = toNumber(quantity, 1);
  }
  return { ...item, ...extra };
}

function sumItemsValue(items = []) {
  return items.reduce(
    (sum, it) => sum + toNumber(it.price, 0) * toNumber(it.quantity ?? 1, 1),
    0
  );
}

/* ----------------------------- Product events ---------------------------- */

export function trackViewItem(product) {
  const item = toGaItem(product, { quantity: 1 });
  trackEvent('view_item', {
    ecommerce: {
      currency: CURRENCY,
      value: toNumber(item.price, 0),
      items: [item]
    }
  });
}

export function trackViewItemList(products = [], listName = 'catalog') {
  const items = products.map((p, index) => toGaItem(p, { index }));
  trackEvent('view_item_list', {
    ecommerce: {
      item_list_id: listName,
      item_list_name: listName,
      items
    }
  });
}

export function trackSelectItem(product, listName = 'catalog') {
  trackEvent('select_item', {
    ecommerce: {
      item_list_id: listName,
      item_list_name: listName,
      items: [toGaItem(product)]
    }
  });
}

/* ------------------------------ Cart events ------------------------------ */

export function trackAddToCart(product, quantity = 1) {
  const item = toGaItem(product, { quantity: toNumber(quantity, 1) });
  trackEvent('add_to_cart', {
    ecommerce: {
      currency: CURRENCY,
      value: toNumber(item.price, 0) * toNumber(item.quantity, 1),
      items: [item]
    }
  });
}

export function trackRemoveFromCart(product, quantity = 1) {
  const item = toGaItem(product, { quantity: toNumber(quantity, 1) });
  trackEvent('remove_from_cart', {
    ecommerce: {
      currency: CURRENCY,
      value: toNumber(item.price, 0) * toNumber(item.quantity, 1),
      items: [item]
    }
  });
}

/* ---------------------------- Checkout funnel ---------------------------- */

export function trackBeginCheckout(items = [], value) {
  const gaItems = items.map((it) => toGaItem(it, { quantity: it.quantity ?? 1 }));
  trackEvent('begin_checkout', {
    ecommerce: {
      currency: CURRENCY,
      value: toNumber(value ?? sumItemsValue(gaItems), 0),
      items: gaItems
    }
  });
}

export function trackAddShippingInfo(items = [], value, shippingTier = 'standard') {
  const gaItems = items.map((it) => toGaItem(it, { quantity: it.quantity ?? 1 }));
  trackEvent('add_shipping_info', {
    ecommerce: {
      currency: CURRENCY,
      value: toNumber(value ?? sumItemsValue(gaItems), 0),
      shipping_tier: shippingTier,
      items: gaItems
    }
  });
}

export function trackAddPaymentInfo(items = [], value, paymentType = 'card') {
  const gaItems = items.map((it) => toGaItem(it, { quantity: it.quantity ?? 1 }));
  trackEvent('add_payment_info', {
    ecommerce: {
      currency: CURRENCY,
      value: toNumber(value ?? sumItemsValue(gaItems), 0),
      payment_type: paymentType,
      items: gaItems
    }
  });
}

export function trackPurchase(order = {}) {
  const items = (Array.isArray(order.items) ? order.items : []).map((it) =>
    toGaItem(it, { quantity: it.quantity ?? 1 })
  );
  trackEvent('purchase', {
    ecommerce: {
      transaction_id: String(order.transaction_id ?? order.order_number ?? order.id ?? ''),
      currency: CURRENCY,
      value: toNumber(order.value ?? order.total_amount, 0),
      tax: toNumber(order.tax ?? order.tax_amount, 0),
      shipping: toNumber(order.shipping ?? order.shipping_amount, 0),
      coupon: order.coupon ?? order.coupon_code ?? undefined,
      items
    }
  });
}

/* ------------------------- Search & filter events ------------------------ */

export function trackSearch(searchTerm) {
  const term = String(searchTerm || '').trim();
  if (!term) return;
  trackEvent('search', { search_term: term });
}

/**
 * Custom event to understand filter usage on the catalog.
 * filterType e.g. 'category', 'price', 'sort', 'in_stock'.
 */
export function trackFilterApplied(filterType, filterValue, extra = {}) {
  trackEvent('filter_applied', {
    filter_type: String(filterType || ''),
    filter_value: Array.isArray(filterValue)
      ? filterValue.join(',')
      : String(filterValue ?? ''),
    ...extra
  });
}
