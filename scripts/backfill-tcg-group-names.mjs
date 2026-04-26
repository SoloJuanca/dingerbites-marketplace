import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tcgcsvHeaders, TCG_CSV_BASE } from '../src/lib/tcgcsvClient.js';

const PRODUCTS_COLLECTION = 'products';

const DEFAULTS = {
  apply: false,
  overwrite: false
};

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  argv.forEach((arg) => {
    if (arg === '--apply') config.apply = true;
    if (arg === '--overwrite') config.overwrite = true;
  });
  return config;
}

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

async function fetchTcgCategories() {
  const res = await fetch(`${TCG_CSV_BASE}/categories`, { headers: tcgcsvHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch TCG categories: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

async function fetchTcgGroups(categoryId) {
  const res = await fetch(`${TCG_CSV_BASE}/${categoryId}/groups`, { headers: tcgcsvHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch TCG groups for ${categoryId}: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}

function shouldUpdateName(currentValue, nextValue, overwrite) {
  if (!nextValue) return false;
  if (overwrite) return true;
  return !currentValue || !String(currentValue).trim();
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  loadDotEnv();

  const { db } = await import('../src/lib/firebaseAdmin.js');
  const now = new Date().toISOString();

  const productsSnap = await db.collection(PRODUCTS_COLLECTION).get();
  const products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const tcgProducts = products.filter((p) => p.tcg_product_id != null && p.tcg_category_id != null && p.tcg_group_id != null);

  const uniqueCategoryIds = [
    ...new Set(tcgProducts.map((p) => String(p.tcg_category_id)).filter(Boolean))
  ];

  const categories = await fetchTcgCategories();
  const categoryNameById = new Map(
    categories.map((c) => [
      String(c.categoryId),
      String(c.displayName || c.name || '').trim()
    ])
  );

  const groupNameByPair = new Map(); // `${catId}::${groupId}` -> name
  for (const catId of uniqueCategoryIds) {
    try {
      const groups = await fetchTcgGroups(catId);
      groups.forEach((g) => {
        const key = `${String(catId)}::${String(g.groupId)}`;
        const name = String(g.name || '').trim();
        if (name) groupNameByPair.set(key, name);
      });
    } catch (err) {
      console.warn(`[WARN] ${err.message}`);
    }
  }

  let willUpdate = 0;
  let updated = 0;
  let missingGroupName = 0;
  let missingCategoryName = 0;
  let batch = db.batch();
  let ops = 0;

  for (const product of tcgProducts) {
    const catId = String(product.tcg_category_id);
    const groupId = String(product.tcg_group_id);
    const pairKey = `${catId}::${groupId}`;
    const groupName = groupNameByPair.get(pairKey) || '';
    const categoryName = categoryNameById.get(catId) || '';

    if (!groupName) missingGroupName += 1;
    if (!categoryName) missingCategoryName += 1;

    const updateData = {};

    if (shouldUpdateName(product.tcg_group_name, groupName, config.overwrite)) {
      updateData.tcg_group_name = groupName;
    }
    if (shouldUpdateName(product.tcg_category_name, categoryName, config.overwrite)) {
      updateData.tcg_category_name = categoryName;
    }

    if (Object.keys(updateData).length === 0) continue;
    updateData.updated_at = now;
    willUpdate += 1;

    if (config.apply) {
      const ref = db.collection(PRODUCTS_COLLECTION).doc(product.id);
      batch.update(ref, updateData);
      ops += 1;
      updated += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
  }

  if (config.apply && ops > 0) {
    await batch.commit();
  }

  const report = {
    mode: config.apply ? 'apply' : 'dry-run',
    overwrite: config.overwrite,
    tcgProductsFound: tcgProducts.length,
    productsToUpdate: willUpdate,
    productsUpdated: config.apply ? updated : 0,
    uniqueTcgCategories: uniqueCategoryIds.length,
    missingGroupNamePairsObserved: missingGroupName,
    missingCategoryNamesObserved: missingCategoryName
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[ERROR]', error);
  process.exit(1);
});

