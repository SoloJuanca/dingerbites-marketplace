import { getEnviaOrigin, quoteShipments, defaultTcgPackage, getEnviaRateOptions } from './envia';
import { buildShippingPackagePlanForItems } from './shippingPackageQuote';

export const DELIVERY_SHIPPING_AMOUNT = 120;

export async function resolveShippingOptionAsync({
  deliveryType,
  shippingMethod,
  origin,
  destination,
  selectedOptionId,
  items,
  sealed = false
} = {}) {
  const isDelivery =
    deliveryType === 'delivery' ||
    shippingMethod === 'Envío a domicilio';

  if (!isDelivery) {
    return { amount: 0, option: null };
  }

  if (destination) {
    const packagePlan = Array.isArray(items) && items.length > 0
      ? await buildShippingPackagePlanForItems(items)
      : null;
    const quote = await quoteShipments({
      origin: origin || getEnviaOrigin(),
      destination,
      packages: packagePlan?.packages || defaultTcgPackage({ sealed })
    });
    const options = getEnviaRateOptions({ data: quote.rates });
    if (options.length === 0) {
      const error = new Error('Envia ya no devuelve opciones de envío para esta dirección. Vuelve a cotizar.');
      error.code = 'SHIPPING_OPTIONS_UNAVAILABLE';
      throw error;
    }
    if (!selectedOptionId) {
      const error = new Error('Selecciona una opción de envío de Envia.');
      error.code = 'SHIPPING_OPTION_REQUIRED';
      throw error;
    }
    const option = options.find((rate) => rate.id === selectedOptionId);
    if (!option) {
      const error = new Error('La opción de envío seleccionada ya no está disponible. Vuelve a cotizar.');
      error.code = 'SHIPPING_OPTION_UNAVAILABLE';
      throw error;
    }
    return {
      amount: option.price,
      option: packagePlan
        ? { ...option, package_summary: packagePlan.summary }
        : option
    };
  }

  const error = new Error('No se pudo calcular el envío. Revisa la dirección y la configuración de Envia.');
  error.code = 'SHIPPING_QUOTE_UNAVAILABLE';
  throw error;
}

export async function resolveShippingAmountAsync(options = {}) {
  return (await resolveShippingOptionAsync(options)).amount;
}

/** Sync fallback for callers not yet migrated to async envia quotes */
export function resolveShippingAmount({ deliveryType, shippingMethod } = {}) {
  const isDelivery =
    deliveryType === 'delivery' ||
    shippingMethod === 'Envío a domicilio';

  if (!isDelivery) {
    return 0;
  }

  return DELIVERY_SHIPPING_AMOUNT;
}
