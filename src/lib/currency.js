const TCG_MIN_MXN = 15;

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
 * Converts USD to MXN with a minimum of 15 MXN (for TCG cards).
 */
export function convertUsdToMxnWithMin(amountUsd) {
  const mxn = convertUsdToMxn(amountUsd);
  if (mxn == null) return null;
  return Math.max(TCG_MIN_MXN, mxn);
}
