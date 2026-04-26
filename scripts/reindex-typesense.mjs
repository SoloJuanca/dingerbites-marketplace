import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function loadDotEnv() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  });
}

async function main() {
  loadDotEnv();
  const [{ db }, { getTypesenseConfig, getTypesenseServerClient, isTypesenseConfigured }, { mapProductToTypesense }] =
    await Promise.all([
      import('../src/lib/firebaseAdmin.js'),
      import('../src/lib/typesenseServer.js'),
      import('../src/lib/search/mapProductToTypesense.js')
    ]);

  if (!isTypesenseConfigured()) {
    console.log(JSON.stringify({ success: false, error: 'typesense_not_configured' }, null, 2));
    process.exit(1);
  }

  const client = getTypesenseServerClient();
  const { collectionName } = getTypesenseConfig();

  const [categorySnapshot, brandSnapshot, productSnapshot] = await Promise.all([
    db.collection('product_categories').get(),
    db.collection('product_brands').get(),
    db.collection('products').get()
  ]);

  const categoriesById = new Map();
  categorySnapshot.docs.forEach((doc) => categoriesById.set(doc.id, { ...doc.data(), id: doc.id }));
  const brandsById = new Map();
  brandSnapshot.docs.forEach((doc) => brandsById.set(doc.id, { ...doc.data(), id: doc.id }));
  const lookups = { categoriesById, brandsById };

  const products = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const batchSize = Number(process.env.TYPESENSE_REINDEX_BATCH_SIZE || 250);
  let indexed = 0;

  for (let offset = 0; offset < products.length; offset += batchSize) {
    const batch = products.slice(offset, offset + batchSize);
    const payload = batch.map((product) => mapProductToTypesense(product, lookups));
    if (payload.length === 0) continue;
    await client
      .collections(collectionName)
      .documents()
      .import(payload, { action: 'upsert', dirty_values: 'coerce_or_drop' });
    indexed += payload.length;
    console.log(`[typesense] indexed ${indexed}/${products.length}`);
  }

  console.log(JSON.stringify({ success: true, result: { indexed, total: products.length } }, null, 2));
}

main().catch((error) => {
  console.error('[ERROR]', error);
  process.exit(1);
});

