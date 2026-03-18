export function roundMoney(value) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return Math.round((safe + Number.EPSILON) * 100) / 100;
}

export function computeSafeOrderTotals({
  subtotal = 0,
  shippingAmount = 0,
  discountAmount = 0
}) {
  const safeSubtotal = roundMoney(subtotal);
  const safeShipping = roundMoney(shippingAmount);
  const safeDiscount = Math.min(roundMoney(discountAmount), safeSubtotal);
  return {
    subtotal: safeSubtotal,
    shipping_amount: safeShipping,
    discount_amount: safeDiscount,
    total_amount: roundMoney(safeSubtotal + safeShipping - safeDiscount)
  };
}

export function validateSingleUseRule({
  maxRedemptionsPerActor = 1,
  actorRedemptionsCount = 0
}) {
  if (maxRedemptionsPerActor <= 0) return false;
  return Number(actorRedemptionsCount) < Number(maxRedemptionsPerActor);
}

export function validateCouponWindow({
  now = Date.now(),
  validFrom = null,
  expiresAt = null
}) {
  const startsAt = validFrom ? new Date(validFrom).getTime() : null;
  const endsAt = expiresAt ? new Date(expiresAt).getTime() : null;
  if (startsAt && startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}
