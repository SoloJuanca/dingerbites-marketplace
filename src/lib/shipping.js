export const DELIVERY_SHIPPING_AMOUNT = 120;
export const FREE_SHIPPING_MIN_SUBTOTAL_MXN = 2000;

export function isFreeShippingSubtotal(subtotal) {
  return Number(subtotal) > FREE_SHIPPING_MIN_SUBTOTAL_MXN;
}

export function resolveShippingAmount({ subtotal = 0, deliveryType, shippingMethod } = {}) {
  const isDelivery =
    deliveryType === 'delivery' ||
    shippingMethod === 'Envío a domicilio';

  if (!isDelivery || isFreeShippingSubtotal(subtotal)) {
    return 0;
  }

  return DELIVERY_SHIPPING_AMOUNT;
}
