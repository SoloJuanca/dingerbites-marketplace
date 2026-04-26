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
  const [{ getTypesenseConfig, getTypesenseServerClient, isTypesenseConfigured }, { PRODUCTS_COLLECTION_SCHEMA }] =
    await Promise.all([import('../src/lib/typesenseServer.js'), import('../src/lib/search/typesenseSchema.js')]);

  if (!isTypesenseConfigured()) {
    console.log(JSON.stringify({ success: false, error: 'typesense_not_configured' }, null, 2));
    process.exit(1);
  }

  const client = getTypesenseServerClient();
  const { collectionName } = getTypesenseConfig();
  const schema = { ...PRODUCTS_COLLECTION_SCHEMA, name: collectionName };

  let existed = false;
  try {
    await client.collections(collectionName).retrieve();
    existed = true;
  } catch (e) {
    existed = false;
  }

  if (existed) {
    await client.collections(collectionName).delete();
    console.log(`[typesense] deleted collection ${collectionName}`);
  }

  await client.collections().create(schema);
  console.log(`[typesense] created collection ${collectionName}`);
  console.log(JSON.stringify({ success: true, collectionName }, null, 2));
}

main().catch((error) => {
  console.error('[ERROR]', error);
  process.exit(1);
});

