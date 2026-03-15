import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { db } from '../../../../../lib/firebaseAdmin';
import { convertUsdToMxnWithMin } from '../../../../../lib/currency';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';
const TCG_BASE = 'https://tcgcsv.com/tcgplayer';
const DEFAULT_CATEGORY_ID = 89;
const DEFAULT_GROUP_ID = 24344;
const DEFAULT_TCG_CATEGORY_SLUG = 'tcg';
const DEFAULT_TCG_BRAND_SLUG = 'riftbound';

const NAME_ALIASES = {
  'captian farron': 'captain farron',
  'bltzcrank impassive': 'blitzcrank impassive',
  'calm rune/a': 'calm rune',
  'calm rune a': 'calm rune',
  'calm rune': 'calm rune',
  'find your center': 'find your center',
  'dr mundo expert': 'dr mundo expert',
  'kai sa evulotionary': 'kai sa - evolutionary',
  'kaisa evulotionary': 'kai sa - evolutionary',
  'kais a evulotionary': 'kai sa - evolutionary',
  'stromclaw ursine': 'stormclaw ursine',
  mistgall: 'mistfall',
  'fight of flight': 'fight or flight',
  'miss fortune buccaner': 'miss fortune buccaneer',
  'warwick hunter': 'warwick hunter',
  'monastery hirana': 'monastery of hirana',
  'divine judgement': 'divine judgment',
  'daugther of the void': 'daughter of the void',
  'darius triunfant': 'darius trifarian',
  'darius triunfant/a': 'darius trifarian',
  'the arenas greatest': "the arena's greatest",
  'the boss': 'sett the boss',
  'hand of noxus': 'darius hand of noxus',
  'loose cannon': 'jinx loose cannon',
  'nine tailed fox': 'ahri nine tailed fox',
  'blind monk': 'lee sin blind monk',
  unforgiven: 'yasuo unforgiven',
  'radiant dawn': 'leona radiant dawn',
  'swift scout': 'teemo swift scout',
  'herald of the arcane': 'viktor herald of the arcane',
  'bounty hunter': 'miss fortune bounty hunter',
  'daughter of the void': 'kai sa daughter of the void',
  'relentless storm': 'volibear relentless storm'
};

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"`’]/g, '')
    .replace(/[^\w\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripVariantMarkers(value) {
  return String(value || '')
    .replace(/\s*\/a\s*$/i, '')
    .replace(/\s*\(alternate art\)\s*$/i, '')
    .replace(/\s*alternate art\s*$/i, '')
    .trim();
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).toLowerCase();
  return ['true', '1', 'yes', 'si'].includes(normalized);
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsvRow(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((v) => v.trim());
}

function getHeaderIndexMap(header) {
  const normalizeHeader = (h) => normalizeName(h).replace(/\s+/g, '');
  const mapped = {};
  header.forEach((h, idx) => {
    mapped[normalizeHeader(h)] = idx;
  });
  return mapped;
}

function getCell(row, headerMap, ...aliases) {
  for (const alias of aliases) {
    const idx = headerMap[alias];
    if (idx !== undefined) return row[idx] || '';
  }
  return '';
}

function getSearchKeys(name) {
  const raw = normalizeName(name);
  const cleaned = normalizeName(stripVariantMarkers(name));
  const aliased = NAME_ALIASES[cleaned] || NAME_ALIASES[raw] || cleaned;
  const noChampionPrefix = aliased.includes('-')
    ? aliased.split('-').slice(1).join('-').trim()
    : aliased;

  return [...new Set([raw, cleaned, aliased, noChampionPrefix].filter(Boolean))];
}

function mergeStocks(rows) {
  const merged = new Map();

  rows.forEach((row) => {
    const key = normalizeName(stripVariantMarkers(row.name));
    if (!key) return;

    if (!merged.has(key)) {
      merged.set(key, {
        sourceNames: new Set([row.name]),
        name: row.name,
        normalStock: 0,
        foilStock: 0
      });
    }

    const entry = merged.get(key);
    entry.sourceNames.add(row.name);
    entry.normalStock += toNumber(row.normalStock, 0);
    entry.foilStock += toNumber(row.foilStock, 0);
  });

  return [...merged.values()].map((entry) => ({
    ...entry,
    sourceNames: [...entry.sourceNames]
  }));
}

function addKeyToIndex(index, key, product) {
  const normalized = normalizeName(key);
  if (!normalized) return;
  if (!index.has(normalized)) index.set(normalized, new Map());
  index.get(normalized).set(String(product.productId), product);
}

function buildTcgIndex(products) {
  const index = new Map();

  products.forEach((product) => {
    addKeyToIndex(index, product.name, product);
    addKeyToIndex(index, product.cleanName, product);
    addKeyToIndex(index, stripVariantMarkers(product.name), product);
    addKeyToIndex(index, stripVariantMarkers(product.cleanName), product);

    if (product.name && product.name.includes('-')) {
      addKeyToIndex(index, product.name.split('-').slice(1).join('-'), product);
    }
  });

  return index;
}

function isAlternateArtProduct(product) {
  return /alternate art/i.test(product?.name || '');
}

function pickPreferredCandidate(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const nonAlternate = candidates.filter((candidate) => !isAlternateArtProduct(candidate));
  if (nonAlternate.length === 1) return nonAlternate[0];

  return null;
}

function resolveProductByName(rowName, index, products) {
  const searchKeys = getSearchKeys(rowName);

  for (const key of searchKeys) {
    const candidatesMap = index.get(key);
    if (candidatesMap && candidatesMap.size > 0) {
      const preferred = pickPreferredCandidate([...candidatesMap.values()]);
      if (preferred) {
        return {
          product: preferred,
          confidence: candidatesMap.size === 1 ? 'exact' : 'exact-preferred'
        };
      }
    }
  }

  const candidates = new Map();
  for (const key of searchKeys) {
    products.forEach((product) => {
      const productKeys = getSearchKeys(product.cleanName || product.name);
      const isMatch = productKeys.some(
        (pk) => pk.includes(key) || key.includes(pk)
      );
      if (isMatch) candidates.set(String(product.productId), product);
    });
  }

  if (candidates.size > 0) {
    const preferred = pickPreferredCandidate([...candidates.values()]);
    if (preferred) {
      return {
        product: preferred,
        confidence: candidates.size === 1 ? 'fuzzy' : 'fuzzy-preferred'
      };
    }
  }

  return {
    product: null,
    confidence: 'none',
    candidates: [...candidates.values()].slice(0, 5)
  };
}

function normalizeSubTypeName(value) {
  return normalizeName(value || 'normal');
}

function resolveSubType(productPrices, variant) {
  if (!Array.isArray(productPrices) || productPrices.length === 0) return null;
  if (variant === 'normal') {
    const normal = productPrices.find(
      (p) => normalizeSubTypeName(p.subTypeName) === 'normal'
    );
    return normal || productPrices[0];
  }

  const foil = productPrices.find((p) =>
    /(foil|holo|holographic)/i.test(p.subTypeName || '')
  );
  return foil || null;
}

async function getCategoryIdForTcg(categoryId) {
  const snap = await db
    .collection(CATEGORIES_COLLECTION)
    .where('tcg_category_id', '==', Number(categoryId))
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function getOrCreateDefaultTcgCategoryId() {
  const bySlug = await db
    .collection(CATEGORIES_COLLECTION)
    .where('slug', '==', DEFAULT_TCG_CATEGORY_SLUG)
    .limit(1)
    .get();

  if (!bySlug.empty) return bySlug.docs[0].id;

  const now = new Date().toISOString();
  const docRef = db.collection(CATEGORIES_COLLECTION).doc();
  await docRef.set({
    name: 'TCG',
    slug: DEFAULT_TCG_CATEGORY_SLUG,
    description: 'Trading Card Game products',
    image_url: null,
    is_active: true,
    sort_order: 0,
    parent_id: null,
    tcg_category_id: null,
    created_at: now,
    updated_at: now
  });
  return docRef.id;
}

async function getOrCreateDefaultBrandId() {
  const bySlug = await db
    .collection(BRANDS_COLLECTION)
    .where('slug', '==', DEFAULT_TCG_BRAND_SLUG)
    .limit(1)
    .get();

  if (!bySlug.empty) return bySlug.docs[0].id;

  const now = new Date().toISOString();
  const docRef = db.collection(BRANDS_COLLECTION).doc();
  await docRef.set({
    name: 'Riftbound',
    slug: DEFAULT_TCG_BRAND_SLUG,
    description: 'Riftbound TCG',
    logo_url: null,
    website_url: null,
    is_active: true,
    created_at: now,
    updated_at: now
  });
  return docRef.id;
}

function getProductUpsertKey(tcgProductId, subTypeName) {
  return `${Number(tcgProductId)}::${normalizeSubTypeName(subTypeName)}`;
}

function ensureUniqueSlug(baseSlug, usedSlugs) {
  let slug = baseSlug;
  let counter = 2;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function buildProductName(baseName, variant) {
  if (normalizeSubTypeName(variant) === 'normal') return baseName;
  if (variant) return `${baseName} (${variant})`;
  return baseName;
}

function getPriceFromTcgRow(priceRow) {
  const usd =
    priceRow?.marketPrice ?? priceRow?.midPrice ?? priceRow?.lowPrice ?? null;
  return convertUsdToMxnWithMin(usd);
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

  if (subTypeName) {
    lines.push(`Variant: ${subTypeName}`);
  }

  const extraLines = [...dataMap.entries()].map(([key, value]) => `${key}: ${value}`);
  const features = [...lines, ...extraLines];
  const description = features.join('\n');
  const shortDescription = features.slice(0, 3).join(' · ');

  return {
    description,
    shortDescription,
    features
  };
}

async function fetchTcgData(categoryId, groupId) {
  const [productsRes, pricesRes] = await Promise.all([
    fetch(`${TCG_BASE}/${categoryId}/${groupId}/products?getExtendedFields=true`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    }),
    fetch(`${TCG_BASE}/${categoryId}/${groupId}/prices`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
  ]);

  if (!productsRes.ok) {
    throw new Error(`TCG products request failed with ${productsRes.status}`);
  }
  if (!pricesRes.ok) {
    throw new Error(`TCG prices request failed with ${pricesRes.status}`);
  }

  const productsPayload = await productsRes.json();
  const pricesPayload = await pricesRes.json();

  return {
    products: productsPayload.results || [],
    prices: pricesPayload.results || []
  };
}

function parseCsvInput(fileText) {
  const lines = fileText
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must include header and at least one row');
  }

  const header = parseCsvRow(lines[0]);
  const headerMap = getHeaderIndexMap(header);
  const hasName = ['nombre', 'name'].some((alias) => headerMap[alias] !== undefined);
  const hasNormal = ['stocknormal'].some((alias) => headerMap[alias] !== undefined);
  const hasFoil = ['stockfoil'].some((alias) => headerMap[alias] !== undefined);
  const hasVariant = ['variante', 'variant', 'subtipo', 'subtypename'].some(
    (alias) => headerMap[alias] !== undefined
  );
  const hasStock = ['stock', 'cantidad', 'stockquantity'].some(
    (alias) => headerMap[alias] !== undefined
  );

  if (!hasName) {
    throw new Error('Missing required column for name');
  }

  const useLegacyFormat = hasNormal && hasFoil;
  const useVariantFormat = hasVariant && hasStock;

  if (!useLegacyFormat && !useVariantFormat) {
    throw new Error(
      'CSV format not recognized. Use columns Nombre,Stock Normal,Stock Foil OR Nombre,Variante,Stock'
    );
  }

  if (useVariantFormat) {
    return {
      format: 'variantRows',
      rows: lines.slice(1).map((line, idx) => {
        const row = parseCsvRow(line);
        return {
          rowNumber: idx + 2,
          name: getCell(row, headerMap, 'nombre', 'name'),
          variant: getCell(row, headerMap, 'variante', 'variant', 'subtipo', 'subtypename'),
          stock: getCell(row, headerMap, 'stock', 'cantidad', 'stockquantity'),
          tcgProductId: getCell(row, headerMap, 'tcgproductid', 'productid', 'idproducto', 'tcgid')
        };
      })
    };
  }

  return {
    format: 'nameRows',
    rows: lines.slice(1).map((line, idx) => {
      const row = parseCsvRow(line);
      return {
        rowNumber: idx + 2,
        name: getCell(row, headerMap, 'nombre', 'name'),
        normalStock: getCell(row, headerMap, 'stocknormal'),
        foilStock: getCell(row, headerMap, 'stockfoil')
      };
    })
  };
}

function resolveSubTypeFromLabel(productPrices, variantLabel) {
  if (!Array.isArray(productPrices) || productPrices.length === 0) return null;
  const normalizedVariant = normalizeSubTypeName(variantLabel || 'normal');

  const exact = productPrices.find(
    (price) => normalizeSubTypeName(price.subTypeName) === normalizedVariant
  );
  if (exact) return exact;

  if (normalizedVariant === 'normal') {
    return resolveSubType(productPrices, 'normal');
  }

  if (/(foil|holo|holographic)/i.test(normalizedVariant)) {
    return resolveSubType(productPrices, 'foil');
  }

  return null;
}

export async function GET(request) {
  const admin = await authenticateAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    endpoint: '/api/admin/products/tcg-bulk-upload',
    method: 'POST',
    accepts: 'multipart/form-data',
    defaults: {
      categoryId: DEFAULT_CATEGORY_ID,
      groupId: DEFAULT_GROUP_ID,
      dryRun: true
    },
    csvColumns: {
      legacy: ['Nombre', 'Stock Normal', 'Stock Foil'],
      variantRows: ['Nombre', 'Variante', 'Stock', 'TCG Product ID (optional)']
    },
    exampleCurl:
      "curl -X POST -H 'Authorization: Bearer <token>' -F \"file=@cards.csv\" -F \"dryRun=true\" -F \"categoryId=89\" -F \"groupId=24344\" http://localhost:3000/api/admin/products/tcg-bulk-upload"
  });
}

export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const categoryId = toNumber(
      formData.get('categoryId'),
      DEFAULT_CATEGORY_ID
    );
    const groupId = toNumber(formData.get('groupId'), DEFAULT_GROUP_ID);
    const dryRun = parseBool(formData.get('dryRun'), false);

    if (!file || typeof file.text !== 'function') {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be .csv' }, { status: 400 });
    }

    const csvText = await file.text();
    const parsedInput = parseCsvInput(csvText);
    const parsedRows = parsedInput.rows;
    const mergedRows =
      parsedInput.format === 'nameRows' ? mergeStocks(parsedRows) : parsedRows;

    const [{ products: tcgProducts, prices: tcgPrices }, productsSnap] =
      await Promise.all([
        fetchTcgData(categoryId, groupId),
        db.collection(PRODUCTS_COLLECTION).get()
      ]);

    const tcgIndex = buildTcgIndex(tcgProducts);
    const tcgProductById = new Map(
      tcgProducts.map((product) => [String(product.productId), product])
    );
    const pricesByProductId = new Map();
    tcgPrices.forEach((priceRow) => {
      const key = String(priceRow.productId);
      if (!pricesByProductId.has(key)) pricesByProductId.set(key, []);
      pricesByProductId.get(key).push(priceRow);
    });

    const existingProducts = productsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    const usedSlugs = new Set(
      existingProducts
        .map((p) => String(p.slug || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const existingByVariantKey = new Map();
    existingProducts.forEach((product) => {
      if (product.tcg_product_id == null || !product.tcg_sub_type_name) return;
      const key = getProductUpsertKey(
        product.tcg_product_id,
        product.tcg_sub_type_name
      );
      existingByVariantKey.set(key, product);
    });

    const categoryDocIdByTcg = await getCategoryIdForTcg(categoryId);
    const fallbackTcgCategoryId = await getOrCreateDefaultTcgCategoryId();
    const defaultBrandId = await getOrCreateDefaultBrandId();
    const categoryDocId = categoryDocIdByTcg || fallbackTcgCategoryId;
    const now = new Date().toISOString();

    const summary = {
      totalRows: parsedRows.length,
      groupedCards: mergedRows.length,
      variantsAttempted:
        parsedInput.format === 'nameRows' ? mergedRows.length * 2 : mergedRows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      unmatched: 0,
      warnings: 0,
      errors: 0
    };

    const report = {
      dryRun,
      created: [],
      updated: [],
      skipped: [],
      unmatched: [],
      warnings: [],
      errors: []
    };

    for (const row of mergedRows) {
      const directById =
        parsedInput.format === 'variantRows' && row.tcgProductId
          ? tcgProductById.get(String(toNumber(row.tcgProductId, 0)))
          : null;
      const resolved = directById
        ? { product: directById, confidence: 'product-id' }
        : resolveProductByName(row.name, tcgIndex, tcgProducts);

      if (!resolved.product) {
        summary.unmatched += 1;
        report.unmatched.push({
          sourceNames: row.sourceNames || [row.name],
          rowNumber: row.rowNumber,
          reason: 'Unable to match card name against TCG products',
          candidates: (resolved.candidates || []).map((p) => p.name)
        });
        continue;
      }

      const tcgProduct = resolved.product;
      const productPriceRows =
        pricesByProductId.get(String(tcgProduct.productId)) || [];

      const rowVariants =
        parsedInput.format === 'nameRows'
          ? [
              { variant: 'normal', stock: row.normalStock },
              { variant: 'foil', stock: row.foilStock }
            ]
          : [{ variant: row.variant || 'Normal', stock: row.stock }];

      for (const rowVariant of rowVariants) {
        const variantStock = rowVariant.stock;
        const variantSubType =
          parsedInput.format === 'nameRows'
            ? resolveSubType(productPriceRows, rowVariant.variant)
            : resolveSubTypeFromLabel(productPriceRows, rowVariant.variant);

        if (!variantSubType) {
          summary.skipped += 1;
          summary.warnings += 1;
          report.warnings.push({
            card: row.name,
            variant: rowVariant.variant,
            reason: `Variant ${rowVariant.variant} is not available in TCG prices`
          });
          continue;
        }

        const subTypeName = variantSubType.subTypeName || 'Normal';
        const variantKey = getProductUpsertKey(tcgProduct.productId, subTypeName);
        const existing = existingByVariantKey.get(variantKey);

        const computedPrice = getPriceFromTcgRow(variantSubType);
        const fallbackImage = tcgProduct.imageUrl || existing?.image || '';
        const baseName = tcgProduct.name || row.name;
        const productName = buildProductName(baseName, subTypeName);
        const generatedCopy = buildTcgDescriptionAndFeatures(tcgProduct, subTypeName);
        const baseSlug = slugify(
          normalizeSubTypeName(subTypeName) === 'normal'
            ? tcgProduct.cleanName || baseName
            : `${tcgProduct.cleanName || baseName} ${subTypeName}`
        );

        if (existing) {
          const updateData = {
            name: productName,
            description: existing.description || generatedCopy.description || '',
            short_description: existing.short_description || generatedCopy.shortDescription || '',
            stock_quantity: toNumber(variantStock, 0),
            category_id: existing.category_id || categoryDocId,
            brand_id: existing.brand_id || defaultBrandId,
            tcg_product_id: Number(tcgProduct.productId),
            tcg_group_id: Number(groupId),
            tcg_category_id: Number(categoryId),
            tcg_sub_type_name: subTypeName,
            features:
              Array.isArray(existing.features) && existing.features.length > 0
                ? existing.features
                : generatedCopy.features,
            meta_description: existing.meta_description || generatedCopy.shortDescription || null,
            meta_keywords:
              existing.meta_keywords ||
              generatedCopy.features.slice(0, 8).join(', ') ||
              null,
            image: fallbackImage,
            images:
              Array.isArray(existing.images) && existing.images.length > 0
                ? existing.images
                : fallbackImage
                  ? [{ url: fallbackImage, alt: productName, is_primary: true, sort_order: 0 }]
                  : [],
            is_active: existing.is_active ?? true,
            updated_at: now
          };

          if ((existing.price == null || Number(existing.price) <= 0) && computedPrice != null) {
            updateData.price = computedPrice;
          }

          if (!dryRun) {
            await db.collection(PRODUCTS_COLLECTION).doc(existing.id).update(updateData);
          }

          summary.updated += 1;
          report.updated.push({
            id: existing.id,
            name: productName,
            stock: toNumber(variantStock, 0),
            subTypeName
          });
          continue;
        }

        const slug = ensureUniqueSlug(baseSlug, usedSlugs);
        const docRef = db.collection(PRODUCTS_COLLECTION).doc();
        const newProduct = {
          id: docRef.id,
          name: productName,
          slug,
          description: generatedCopy.description || '',
          short_description: generatedCopy.shortDescription || '',
          price: computedPrice ?? 0,
          compare_price: null,
          cost_price: null,
          sku: null,
          barcode: null,
          stock_quantity: toNumber(variantStock, 0),
          low_stock_threshold: 5,
          allow_backorders: false,
          category_id: categoryDocId,
          brand_id: defaultBrandId,
          is_active: true,
          is_featured: false,
          is_bestseller: false,
          weight_grams: null,
          dimensions_cm: null,
          meta_title: null,
          meta_description: generatedCopy.shortDescription || null,
          meta_keywords: generatedCopy.features.slice(0, 8).join(', ') || null,
          features: generatedCopy.features,
          image: fallbackImage,
          images: fallbackImage
            ? [{ url: fallbackImage, alt: productName, is_primary: true, sort_order: 0 }]
            : [],
          tcg_product_id: Number(tcgProduct.productId),
          tcg_group_id: Number(groupId),
          tcg_category_id: Number(categoryId),
          tcg_sub_type_name: subTypeName,
          created_at: now,
          updated_at: now
        };

        if (!dryRun) {
          await docRef.set(newProduct);
        }

        existingByVariantKey.set(variantKey, newProduct);
        summary.created += 1;
        report.created.push({
          id: docRef.id,
          name: productName,
          stock: toNumber(variantStock, 0),
          subTypeName
        });
      }
    }

    summary.errors = report.errors.length;

    return NextResponse.json({
      success: true,
      message: dryRun
        ? 'Dry run completed'
        : 'TCG bulk import completed',
      summary,
      report
    });
  } catch (error) {
    console.error('Error in TCG bulk upload:', error);
    return NextResponse.json(
      {
        error: 'Failed to process TCG bulk upload',
        details: error.message
      },
      { status: 500 }
    );
  }
}
