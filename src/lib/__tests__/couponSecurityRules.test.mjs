import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSafeOrderTotals,
  validateSingleUseRule,
  validateCouponWindow
} from '../couponSecurityRules.js';

test('computeSafeOrderTotals caps discount by subtotal', () => {
  const totals = computeSafeOrderTotals({
    subtotal: 200,
    shippingAmount: 120,
    discountAmount: 1000
  });

  assert.equal(totals.discount_amount, 200);
  assert.equal(totals.total_amount, 120);
});

test('validateSingleUseRule blocks second usage', () => {
  assert.equal(
    validateSingleUseRule({
      maxRedemptionsPerActor: 1,
      actorRedemptionsCount: 1
    }),
    false
  );
});

test('validateCouponWindow validates current date window', () => {
  const now = Date.now();
  assert.equal(
    validateCouponWindow({
      now,
      validFrom: new Date(now - 5 * 60 * 1000).toISOString(),
      expiresAt: new Date(now + 5 * 60 * 1000).toISOString()
    }),
    true
  );

  assert.equal(
    validateCouponWindow({
      now,
      validFrom: new Date(now + 60 * 1000).toISOString(),
      expiresAt: new Date(now + 5 * 60 * 1000).toISOString()
    }),
    false
  );
});
