const PICKUP_SHIPPING_METHODS = new Set(['Recoger en punto', 'Recoger en tienda']);

export function isPickupShippingMethod(shippingMethod) {
  return PICKUP_SHIPPING_METHODS.has(String(shippingMethod || '').trim());
}

export function buildShippingAddressSnapshotFromRecord(addr = {}) {
  if (!addr || typeof addr !== 'object') return null;

  const parts = [
    addr.address_line_1,
    addr.address_line_2,
    addr.city,
    addr.state,
    addr.postal_code,
    addr.country && addr.country !== 'Mexico' ? addr.country : null
  ].filter((part) => part && String(part).trim());

  if (parts.length === 0) return null;

  return {
    first_name: addr.first_name || null,
    last_name: addr.last_name || null,
    address_line_1: addr.address_line_1 || null,
    address_line_2: addr.address_line_2 || null,
    city: addr.city || null,
    state: addr.state || null,
    postal_code: addr.postal_code || null,
    country: addr.country || 'Mexico',
    phone: addr.phone || null,
    formatted: parts.join(', ')
  };
}

export function buildShippingAddressSnapshotFromText(formattedAddress) {
  const text = String(formattedAddress || '').trim();
  if (!text) return null;

  return {
    address_line_1: text,
    formatted: text
  };
}

export function formatShippingAddressForDisplay(shippingAddress) {
  if (!shippingAddress) return null;
  if (shippingAddress.formatted && String(shippingAddress.formatted).trim()) {
    return String(shippingAddress.formatted).trim();
  }

  const parts = [
    shippingAddress.address_line_1,
    shippingAddress.address_line_2,
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.postal_code
  ].filter((part) => part && String(part).trim());

  return parts.length > 0 ? parts.join(', ') : null;
}

export function hasDisplayableShippingAddress(shippingAddress) {
  return Boolean(formatShippingAddressForDisplay(shippingAddress));
}
