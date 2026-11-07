import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createShippingPackageForItems,
  createShippingPackagePlanForItems
} from '../shippingPackageSizes.js';

test('TCG cards use the configured envelope dimensions and weight', () => {
  const [shippingPackage] = createShippingPackageForItems(
    [{ productId: 'card', quantity: 1 }],
    new Map([['card', { tcg_product_id: 123 }]])
  );

  assert.equal(shippingPackage.weight, 1);
  assert.deepEqual(shippingPackage.dimensions, { length: 19, width: 22, height: 2 });
});

test('mixed cart uses the largest package size and totals known product weights', () => {
  const [shippingPackage] = createShippingPackageForItems(
    [
      { productId: 'card', quantity: 2 },
      { productId: 'board-game', quantity: 1 }
    ],
    new Map([
      ['card', { tcg_product_id: 123, weight_grams: 100 }],
      ['board-game', { shipping_package_size: 'medium', weight_grams: 2400 }]
    ])
  );

  assert.equal(shippingPackage.weight, 3);
  assert.deepEqual(shippingPackage.dimensions, { length: 30, width: 20, height: 15 });
});

test('one large item and one small item become one large package', () => {
  const plan = createShippingPackagePlanForItems(
    [
      { productId: 'large-product', quantity: 1 },
      { productId: 'small-product', quantity: 1 }
    ],
    new Map([
      ['large-product', { shipping_package_size: 'large' }],
      ['small-product', { shipping_package_size: 'small' }]
    ])
  );

  assert.equal(plan.packages.length, 1);
  assert.deepEqual(plan.summary, {
    packageCount: 1,
    size: 'large',
    label: 'Grande',
    dimensions: { length: 40, width: 30, height: 20 },
    weight: 5
  });
  assert.deepEqual(createShippingPackageForItems(
    [
      { productId: 'small-product', quantity: 1 },
      { productId: 'large-product', quantity: 1 }
    ],
    new Map([
      ['large-product', { shipping_package_size: 'large' }],
      ['small-product', { shipping_package_size: 'small' }]
    ])
  )[0].dimensions, plan.packages[0].dimensions);
});

test('unknown weights use the selected size estimate rather than partial weights', () => {
  const [shippingPackage] = createShippingPackageForItems(
    [
      { productId: 'weighted', quantity: 1 },
      { productId: 'unweighted', quantity: 3 }
    ],
    new Map([
      ['weighted', { shipping_package_size: 'small', weight_grams: 250 }],
      ['unweighted', { shipping_package_size: 'large' }]
    ])
  );

  assert.equal(shippingPackage.weight, 5);
  assert.deepEqual(shippingPackage.dimensions, { length: 40, width: 30, height: 20 });
});
