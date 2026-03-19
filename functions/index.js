/* eslint-disable no-console */
const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const Typesense = require('typesense');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST,
      port: process.env.TYPESENSE_PORT || '443',
      protocol: process.env.TYPESENSE_PROTOCOL || 'https'
    }
  ],
  apiKey: process.env.TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 8
});

const collectionName = process.env.TYPESENSE_COLLECTION_PRODUCTS || 'products_v1';

async function loadLookups() {
  const [categoriesSnap, brandsSnap] = await Promise.all([
    db.collection('product_categories').get(),
    db.collection('product_brands').get()
  ]);
  const categoriesById = new Map(categoriesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const brandsById = new Map(brandsSnap.docs.map((doc) => [doc.id, doc.data()]));
  return { categoriesById, brandsById };
}

function toTimestamp(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mapProduct(product, lookup) {
  const category = product.category_id ? lookup.categoriesById.get(String(product.category_id)) : null;
  const subcategory = product.subcategory_id ? lookup.categoriesById.get(String(product.subcategory_id)) : null;
  const manufacturerBrand = product.manufacturer_brand_id
    ? lookup.brandsById.get(String(product.manufacturer_brand_id))
    : null;
  const franchiseBrand = product.franchise_brand_id
    ? lookup.brandsById.get(String(product.franchise_brand_id))
    : null;
  const legacyBrand = product.brand_id ? lookup.brandsById.get(String(product.brand_id)) : null;
  const brand = franchiseBrand || manufacturerBrand || legacyBrand || null;
  const tags = Array.isArray(product.tags) ? product.tags.map(String).filter(Boolean) : [];

  return {
    id: String(product.id || ''),
    slug: String(product.slug || ''),
    name: String(product.name || ''),
    name_normalized: normalizeText(product.name || ''),
    description: String(product.description || ''),
    short_description: String(product.short_description || ''),
    sku: String(product.sku || ''),
    barcode: String(product.barcode || ''),
    search_blob: [
      product.name || '',
      product.description || '',
      product.short_description || '',
      product.sku || '',
      product.barcode || '',
      category?.name || '',
      brand?.name || '',
      tags.join(' ')
    ].join(' '),
    category_slug: category?.slug || '',
    subcategory_slug: subcategory?.slug || '',
    manufacturer_brand_slug: manufacturerBrand?.slug || '',
    franchise_brand_slug: franchiseBrand?.slug || '',
    brand_slug: brand?.slug || '',
    brand_name: brand?.name || '',
    condition: String(product.condition || ''),
    tags,
    price: Number(product.price || 0),
    stock_quantity: Number(product.stock_quantity || 0),
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
    is_bestseller: Boolean(product.is_bestseller),
    popularity: Number(product.view_count || 0),
    created_at: product.created_at || null,
    updated_at: product.updated_at || null,
    created_at_ts: toTimestamp(product.created_at),
    updated_at_ts: toTimestamp(product.updated_at),
    image:
      product.image ||
      (Array.isArray(product.images) && product.images.length > 0
        ? String(product.images[0]?.url || product.images[0] || '')
        : '')
  };
}

async function upsertProduct(productId) {
  const productDoc = await db.collection('products').doc(String(productId)).get();
  if (!productDoc.exists) return;
  const lookup = await loadLookups();
  const mapped = mapProduct({ id: productDoc.id, ...productDoc.data() }, lookup);
  await client.collections(collectionName).documents().upsert(mapped);
}

exports.searchProductCreated = onDocumentCreated('products/{productId}', async (event) => {
  await upsertProduct(event.params.productId);
});

exports.searchProductUpdated = onDocumentUpdated('products/{productId}', async (event) => {
  await upsertProduct(event.params.productId);
});

exports.searchProductDeleted = onDocumentDeleted('products/{productId}', async (event) => {
  await client.collections(collectionName).documents(String(event.params.productId)).delete();
});
