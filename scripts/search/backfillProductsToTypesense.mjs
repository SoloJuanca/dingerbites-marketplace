import { config as loadEnv } from 'dotenv';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Typesense from 'typesense';

// Node no carga .env solo; Next sí. Cargar antes de leer process.env.
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: true });

function normalizeStorageBucketName(value) {
  if (!value) return '';
  return String(value)
    .replace(/^gs:\/\//, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .split('/')[0]
    .trim();
}

function getFirebaseCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson);
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    return cert(parsed);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase credentials are missing.');
  }
  return cert({ projectId, clientEmail, privateKey });
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toTimestamp(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

const storageBucket = normalizeStorageBucketName(process.env.FIREBASE_STORAGE_BUCKET);
const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: getFirebaseCredential(),
      storageBucket
    });
const db = getFirestore(firebaseApp, process.env.FIREBASE_DATABASE_ID || '(default)');

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

const [categoriesSnap, brandsSnap, productsSnap] = await Promise.all([
  db.collection('product_categories').get(),
  db.collection('product_brands').get(),
  db.collection('products').get()
]);

const categoriesById = new Map(categoriesSnap.docs.map((doc) => [doc.id, doc.data()]));
const brandsById = new Map(brandsSnap.docs.map((doc) => [doc.id, doc.data()]));

const docs = productsSnap.docs.map((doc) => {
  const product = { id: doc.id, ...doc.data() };
  const category = product.category_id ? categoriesById.get(String(product.category_id)) : null;
  const subcategory = product.subcategory_id ? categoriesById.get(String(product.subcategory_id)) : null;
  const manufacturerBrand = product.manufacturer_brand_id
    ? brandsById.get(String(product.manufacturer_brand_id))
    : null;
  const franchiseBrand = product.franchise_brand_id ? brandsById.get(String(product.franchise_brand_id)) : null;
  const legacyBrand = product.brand_id ? brandsById.get(String(product.brand_id)) : null;
  const brand = franchiseBrand || manufacturerBrand || legacyBrand || null;
  const tags = Array.isArray(product.tags) ? product.tags.filter(Boolean).map(String) : [];
  const searchBlob = [
    product.name || '',
    product.description || '',
    product.short_description || '',
    product.sku || '',
    product.barcode || '',
    brand?.name || '',
    category?.name || '',
    tags.join(' ')
  ].join(' ');

  return {
    id: String(product.id),
    slug: String(product.slug || ''),
    name: String(product.name || ''),
    name_normalized: normalizeText(product.name || ''),
    description: String(product.description || ''),
    short_description: String(product.short_description || ''),
    sku: String(product.sku || ''),
    barcode: String(product.barcode || ''),
    search_blob: searchBlob,
    category_slug: category?.slug || '',
    subcategory_slug: subcategory?.slug || '',
    manufacturer_brand_slug: manufacturerBrand?.slug || '',
    franchise_brand_slug: franchiseBrand?.slug || '',
    brand_slug: brand?.slug || '',
    brand_name: brand?.name || '',
    condition: product.condition || '',
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
});

const response = await client
  .collections(collectionName)
  .documents()
  .import(docs, { action: 'upsert', dirty_values: 'coerce_or_drop' });

console.log(`Indexed ${docs.length} products.`);
console.log(response.slice(0, 400));
