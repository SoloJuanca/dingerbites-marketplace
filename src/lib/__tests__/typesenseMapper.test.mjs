import test from 'node:test';
import assert from 'node:assert/strict';
import { mapProductToTypesense } from '../search/mapProductToTypesense.js';

test('mapProductToTypesense maps and normalizes product payload', () => {
  const categoriesById = new Map([
    ['cat-1', { id: 'cat-1', name: 'Categoría Á', slug: 'categoria-a' }]
  ]);
  const brandsById = new Map([
    ['brand-1', { id: 'brand-1', name: 'Marca Uno', slug: 'marca-uno' }]
  ]);

  const mapped = mapProductToTypesense(
    {
      id: 'p1',
      slug: 'producto-prueba',
      name: 'Producto Ácido',
      description: 'Descripción',
      short_description: 'Corta',
      sku: 'SKU-1',
      barcode: 'BAR-1',
      category_id: 'cat-1',
      brand_id: 'brand-1',
      price: 199.99,
      stock_quantity: 4,
      is_active: true,
      is_featured: false,
      is_bestseller: true,
      view_count: 33,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z'
    },
    { categoriesById, brandsById }
  );

  assert.equal(mapped.id, 'p1');
  assert.equal(mapped.name_normalized, 'producto acido');
  assert.equal(mapped.category_slug, 'categoria-a');
  assert.equal(mapped.brand_slug, 'marca-uno');
  assert.equal(mapped.price, 199.99);
  assert.equal(mapped.is_active, true);
  assert.equal(mapped.created_at_ts > 0, true);
});
