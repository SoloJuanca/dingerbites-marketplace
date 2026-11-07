import test from 'node:test';
import assert from 'node:assert/strict';
import { isRiftboundProduct, RIFTBOUND_FALLBACK_IMAGE } from '../productImages.js';

test('Riftbound detection uses the product brand names', () => {
  assert.equal(isRiftboundProduct({ franchise_brand_name: 'Riftbound' }), true);
  assert.equal(isRiftboundProduct({ brand_name: ' riftbound ' }), true);
  assert.equal(isRiftboundProduct({ brand_name: 'Pokémon' }), false);
  assert.equal(isRiftboundProduct({}), false);
});

test('Riftbound fallback points to the local public asset', () => {
  assert.equal(RIFTBOUND_FALLBACK_IMAGE, '/riftbound-card-back.png');
});
