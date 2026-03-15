import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';

const DEFAULTS = {
  apply: false,
  categorySlug: 'tcg',
  categoryName: 'TCG',
  brandSlug: 'riftbound',
  brandName: 'Riftbound'
};

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  argv.forEach((arg) => {
    if (arg === '--apply') config.apply = true;
    if (arg.startsWith('--category-slug=')) config.categorySlug = arg.split('=').slice(1).join('=');
    if (arg.startsWith('--category-name=')) config.categoryName = arg.split('=').slice(1).join('=');
    if (arg.startsWith('--brand-slug=')) config.brandSlug = arg.split('=').slice(1).join('=');
    if (arg.startsWith('--brand-name=')) config.brandName = arg.split('=').slice(1).join('=');
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

function normalizeSubTypeName(value) {
  return String(value || 'normal')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"`’]/g, '')
    .replace(/[^\w\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getExtendedDataMap(tcgProduct) {
  const map = new Map();
  const extendedData = Array.isArray(tcgProduct?.extendedData) ? tcgProduct.extendedData : [];
  extendedData.forEach((entry) => {
    const key = String(entry?.displayName || entry?.name || '').trim();
    const value = String(entry?.value || '').trim();
    if (!key || !value) return;
    map.set(key, value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim());
  });
  return map;
}

function buildTcgDescriptionAndFeatures(tcgProduct, subTypeName) {
  const dataMap = getExtendedDataMap(tcgProduct);
  const lines = [];
  const preferred = ['Rarity', 'Card Number', 'Number', 'Card Type', 'Set Name'];

  preferred.forEach((key) => {
    if (dataMap.has(key)) {
      lines.push(`${key}: ${dataMap.get(key)}`);
      dataMap.delete(key);
    }
  });

  if (subTypeName) lines.push(`Variant: ${subTypeName}`);

  const extraLines = [...dataMap.entries()].map(([key, value]) => `${key}: ${value}`);
  const features = [...lines, ...extraLines];

  return {
    description: features.join('\n'),
    shortDescription: features.slice(0, 3).join(' · '),
    features
  };
}

async function getOrCreateBySlug({
  db,
  collection,
  slug,
  payload,
  apply
}) {
  const bySlug = await db.collection(collection).where('slug', '==', slug).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0].id;
  if (!apply) return null;
  const docRef = db.collection(collection).doc();
  await docRef.set(payload);
  return docRef.id;
}

async function fetchTcgProductsMap(categoryId, groupId) {
  const response = await fetch(
    `https://tcgcsv.com/tcgplayer/${categoryId}/${groupId}/products?getExtendedFields=true`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch TCG products for ${categoryId}/${groupId}: ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return new Map(results.map((product) => [String(product.productId), product]));
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  loadDotEnv();

  const { db } = await import('../src/lib/firebaseAdmin.js');

  const now = new Date().toISOString();
  const categoryId = await getOrCreateBySlug({
    db,
    collection: CATEGORIES_COLLECTION,
    slug: config.categorySlug,
    apply: config.apply,
    payload: {
      name: config.categoryName,
      slug: config.categorySlug,
      description: 'Trading Card Game products',
      image_url: null,
      is_active: true,
      sort_order: 0,
      parent_id: null,
      tcg_category_id: null,
      created_at: now,
      updated_at: now
    }
  });

  const brandId = await getOrCreateBySlug({
    db,
    collection: BRANDS_COLLECTION,
    slug: config.brandSlug,
    apply: config.apply,
    payload: {
      name: config.brandName,
      slug: config.brandSlug,
      description: `${config.brandName} TCG`,
      logo_url: null,
      website_url: null,
      is_active: true,
      created_at: now,
      updated_at: now
    }
  });

  const productsSnap = await db.collection(PRODUCTS_COLLECTION).get();
  const products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const tcgProducts = products.filter((product) => product.tcg_product_id != null);

  const pairSet = new Set();
  tcgProducts.forEach((product) => {
    if (product.tcg_category_id != null && product.tcg_group_id != null) {
      pairSet.add(`${Number(product.tcg_category_id)}::${Number(product.tcg_group_id)}`);
    }
  });

  const tcgDataByPair = new Map();
  for (const pair of pairSet) {
    const [tcgCategoryId, tcgGroupId] = pair.split('::');
    try {
      const productsMap = await fetchTcgProductsMap(tcgCategoryId, tcgGroupId);
      tcgDataByPair.set(pair, productsMap);
    } catch (error) {
      console.warn(`[WARN] ${error.message}`);
    }
  }

  let willUpdate = 0;
  let descriptionFilled = 0;
  let featuresFilled = 0;
  let categoryFilled = 0;
  let brandFilled = 0;
  let missingTcgData = 0;
  let batch = db.batch();
  let ops = 0;

  for (const product of tcgProducts) {
    const pair =
      product.tcg_category_id != null && product.tcg_group_id != null
        ? `${Number(product.tcg_category_id)}::${Number(product.tcg_group_id)}`
        : null;
    const tcgById = pair ? tcgDataByPair.get(pair) : null;
    const tcgProduct = tcgById?.get(String(product.tcg_product_id));

    if (!tcgProduct) {
      missingTcgData += 1;
    }

    const generated = tcgProduct
      ? buildTcgDescriptionAndFeatures(tcgProduct, product.tcg_sub_type_name || 'Normal')
      : null;

    const updateData = {};

    if (!product.category_id && categoryId) {
      updateData.category_id = categoryId;
      categoryFilled += 1;
    }

    if (!product.brand_id && brandId) {
      updateData.brand_id = brandId;
      brandFilled += 1;
    }

    if ((!product.description || !String(product.description).trim()) && generated?.description) {
      updateData.description = generated.description;
      updateData.short_description = generated.shortDescription || '';
      updateData.meta_description = generated.shortDescription || null;
      updateData.meta_keywords = generated.features.slice(0, 8).join(', ') || null;
      descriptionFilled += 1;
    }

    if ((!Array.isArray(product.features) || product.features.length === 0) && generated?.features?.length) {
      updateData.features = generated.features;
      featuresFilled += 1;
    }

    if ((!product.image || !String(product.image).trim()) && tcgProduct?.imageUrl) {
      updateData.image = tcgProduct.imageUrl;
      if (!Array.isArray(product.images) || product.images.length === 0) {
        updateData.images = [
          {
            url: tcgProduct.imageUrl,
            alt: product.name || tcgProduct.name || '',
            is_primary: true,
            sort_order: 0
          }
        ];
      }
    }

    if (Object.keys(updateData).length === 0) continue;
    updateData.updated_at = now;
    willUpdate += 1;

    if (config.apply) {
      const ref = db.collection(PRODUCTS_COLLECTION).doc(product.id);
      batch.update(ref, updateData);
      ops += 1;
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
    tcgProductsFound: tcgProducts.length,
    productsToUpdate: willUpdate,
    categoryFilled,
    brandFilled,
    descriptionFilled,
    featuresFilled,
    missingTcgData,
    categoryResolved: categoryId ? { id: categoryId, slug: config.categorySlug } : null,
    brandResolved: brandId ? { id: brandId, slug: config.brandSlug } : null
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[ERROR]', error);
  process.exit(1);
});
