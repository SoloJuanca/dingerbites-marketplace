import { config as loadEnv } from 'dotenv';
import Typesense from 'typesense';

loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: true });

const host = process.env.TYPESENSE_HOST;
const port = process.env.TYPESENSE_PORT || '443';
const protocol = process.env.TYPESENSE_PROTOCOL || 'https';
const apiKey = process.env.TYPESENSE_ADMIN_API_KEY;
const collectionName = process.env.TYPESENSE_COLLECTION_PRODUCTS || 'products_v1';

if (!host || !apiKey) {
  console.error('Missing Typesense env vars. Set TYPESENSE_HOST and TYPESENSE_ADMIN_API_KEY.');
  process.exit(1);
}

const client = new Typesense.Client({
  nodes: [{ host, port, protocol }],
  apiKey,
  connectionTimeoutSeconds: 8
});

const schema = {
  name: collectionName,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'name', type: 'string', infix: true },
    { name: 'name_normalized', type: 'string', optional: true, infix: true },
    { name: 'description', type: 'string', optional: true },
    { name: 'short_description', type: 'string', optional: true },
    { name: 'sku', type: 'string', optional: true },
    { name: 'barcode', type: 'string', optional: true },
    { name: 'search_blob', type: 'string', optional: true, infix: true },
    { name: 'category_id', type: 'string', optional: true, facet: true },
    { name: 'category_slug', type: 'string', optional: true, facet: true },
    { name: 'category_name', type: 'string', optional: true, facet: true },
    { name: 'subcategory_id', type: 'string', optional: true, facet: true },
    { name: 'subcategory_slug', type: 'string', optional: true, facet: true },
    { name: 'manufacturer_brand_id', type: 'string', optional: true, facet: true },
    { name: 'manufacturer_brand_slug', type: 'string', optional: true, facet: true },
    { name: 'franchise_brand_id', type: 'string', optional: true, facet: true },
    { name: 'franchise_brand_slug', type: 'string', optional: true, facet: true },
    { name: 'brand_id', type: 'string', optional: true, facet: true },
    { name: 'brand_slug', type: 'string', optional: true, facet: true },
    { name: 'brand_name', type: 'string', optional: true, facet: true },
    { name: 'condition', type: 'string', optional: true, facet: true },
    { name: 'tags', type: 'string[]', optional: true, facet: true },
    { name: 'price', type: 'float', optional: true, sort: true },
    { name: 'stock_quantity', type: 'int32', optional: true, sort: true },
    { name: 'is_active', type: 'bool', facet: true },
    { name: 'is_featured', type: 'bool', facet: true },
    { name: 'is_bestseller', type: 'bool', facet: true },
    { name: 'popularity', type: 'float', optional: true, sort: true },
    { name: 'created_at_ts', type: 'int64', sort: true },
    { name: 'updated_at_ts', type: 'int64', optional: true, sort: true },
    { name: 'created_at', type: 'string', optional: true },
    { name: 'updated_at', type: 'string', optional: true },
    { name: 'image', type: 'string', optional: true }
  ],
  default_sorting_field: 'created_at_ts'
};

try {
  await client.collections(collectionName).retrieve();
  await client.collections(collectionName).delete();
  console.log(`Deleted existing collection: ${collectionName}`);
} catch (error) {
  if (error?.httpStatus !== 404) {
    console.error('Unexpected error retrieving/deleting collection:', error);
    process.exit(1);
  }
}

await client.collections().create(schema);
console.log(`Collection created: ${collectionName}`);
