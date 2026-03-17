const DEFAULT_TCG_MIN_PRICE_MXN = 15;
const DEFAULT_TCG_MIN_PRICE_FOIL_MXN = 18;

function resolveEnvNumber(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function getTcgMinPriceMxn() {
  return (
    resolveEnvNumber('TCG_MIN_PRICE_MXN', 'NEXT_PUBLIC_TCG_MIN_PRICE_MXN') ??
    DEFAULT_TCG_MIN_PRICE_MXN
  );
}

export function getTcgMinPriceFoilMxn() {
  return (
    resolveEnvNumber('TCG_MIN_PRICE_FOIL_MXN', 'NEXT_PUBLIC_TCG_MIN_PRICE_FOIL_MXN') ??
    DEFAULT_TCG_MIN_PRICE_FOIL_MXN
  );
}

export function getTcgMinPriceForSubType(subTypeName) {
  const normalized = String(subTypeName || 'normal').toLowerCase();
  if (/(foil|holo|holographic)/i.test(normalized)) {
    return getTcgMinPriceFoilMxn();
  }
  return getTcgMinPriceMxn();
}

/**
 * Converts USD to MXN using TCG_USD_TO_MXN env var.
 * Fallback rate: 17.5
 */
export function convertUsdToMxn(amountUsd) {
  if (amountUsd == null || amountUsd === '' || Number.isNaN(Number(amountUsd))) {
    return null;
  }
  const usd = Number(amountUsd);
  const rate = Number(process.env.TCG_USD_TO_MXN) || 17.5;
  return Math.round(usd * rate * 100) / 100;
}

/**
 * Converts USD to MXN with a minimum floor for TCG cards.
 * - Normal minimum from TCG_MIN_PRICE_MXN
 * - Foil/Holo minimum from TCG_MIN_PRICE_FOIL_MXN (default 18)
 */
export function convertUsdToMxnWithMin(amountUsd, subTypeName = 'Normal') {
  const mxn = convertUsdToMxn(amountUsd);
  if (mxn == null) return null;
  return Math.max(getTcgMinPriceForSubType(subTypeName), mxn);
}
