import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebaseAdmin';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';

function toNum(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// POST /api/products/bulk-upload - Upload multiple products from CSV
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header and one data row' },
        { status: 400 }
      );
    }

    const header = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    const dataRows = lines.slice(1);

    const requiredColumns = ['nombre', 'precio', 'categoria', 'activo'];
    const missingColumns = requiredColumns.filter((col) => !header.includes(col));
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      );
    }

    const [categoriesSnap, brandsSnap, productsSnap] = await Promise.all([
      db.collection(CATEGORIES_COLLECTION).get(),
      db.collection(BRANDS_COLLECTION).get(),
      db.collection(PRODUCTS_COLLECTION).get()
    ]);
    const categoriesByKey = new Map();
    categoriesSnap.docs.forEach((d) => {
      const data = d.data();
      categoriesByKey.set(String(data.name || '').toLowerCase(), d.id);
      categoriesByKey.set(String(data.slug || '').toLowerCase(), d.id);
    });
    const brandsByKey = new Map();
    brandsSnap.docs.forEach((d) => {
      const data = d.data();
      brandsByKey.set(String(data.name || '').toLowerCase(), d.id);
      brandsByKey.set(String(data.slug || '').toLowerCase(), d.id);
    });
    const existingSlugs = new Set(productsSnap.docs.map((d) => (d.data().slug || '').toLowerCase()));
    const existingSkus = new Set(productsSnap.docs.map((d) => (d.data().sku || '').toLowerCase()).filter(Boolean));

    const results = { success: [], errors: [], total: dataRows.length };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;
      try {
        const values = parseCSVRow(row);
        if (values.length !== header.length) {
          results.errors.push({
            row: rowNumber,
            error: `Column count mismatch. Expected ${header.length}, got ${values.length}`
          });
          continue;
        }

        const productData = {};
        header.forEach((col, index) => {
          productData[col] = values[index]?.trim() || '';
        });

        const result = await processProductRow(
          productData,
          rowNumber,
          categoriesByKey,
          brandsByKey,
          existingSlugs,
          existingSkus
        );
        if (result.success) {
          results.success.push(result.product);
          existingSlugs.add((result.product.slug || '').toLowerCase());
          if (result.product.sku) existingSkus.add(String(result.product.sku).toLowerCase());
        } else {
          results.errors.push({ row: rowNumber, error: result.error });
        }
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: `Failed to parse row: ${error.message}`
        });
      }
    }

    return NextResponse.json({
      message: `Bulk upload completed. ${results.success.length} products created, ${results.errors.length} errors.`,
      results
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}

function parseCSVRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((v) => v.replace(/^"|"$/g, ''));
}

async function processProductRow(data, rowNumber, categoriesByKey, brandsByKey, existingSlugs, existingSkus) {
  if (!data.nombre || !data.precio || !data.categoria || !data.activo) {
    return {
      success: false,
      error: 'Missing required fields: nombre, precio, categoria, or activo'
    };
  }

  const price = parseFloat(data.precio);
  if (isNaN(price) || price < 0) {
    return { success: false, error: 'Invalid price format' };
  }

  const activo = data.activo.toLowerCase() === 'true';
  const destacado = data.destacado ? data.destacado.toLowerCase() === 'true' : false;
  const bestseller = data.bestseller ? data.bestseller.toLowerCase() === 'true' : false;
  const permitir_pedidos_pendientes = data.permitir_pedidos_pendientes
    ? data.permitir_pedidos_pendientes.toLowerCase() === 'true'
    : false;

  const categoryId = categoriesByKey.get(data.categoria.trim().toLowerCase()) || categoriesByKey.get(slugify(data.categoria));
  if (!categoryId) {
    return { success: false, error: `Category not found: ${data.categoria}` };
  }

  let brandId = null;
  if (data.marca) {
    brandId = brandsByKey.get(data.marca.trim().toLowerCase()) || brandsByKey.get(slugify(data.marca));
    if (!brandId) {
      return { success: false, error: `Brand not found: ${data.marca}` };
    }
  }

  let slug = data.slug ? data.slug.trim() : slugify(data.nombre);
  if (existingSlugs.has(slug.toLowerCase())) {
    return { success: false, error: `Product with slug already exists: ${slug}` };
  }

  if (data.sku && existingSkus.has(String(data.sku).toLowerCase())) {
    return { success: false, error: `Product with SKU already exists: ${data.sku}` };
  }

  const now = new Date().toISOString();
  const dimensions =
    data.largo_cm && data.ancho_cm && data.alto_cm
      ? { length: toNum(data.largo_cm), width: toNum(data.ancho_cm), height: toNum(data.alto_cm) }
      : null;

  const images = [];
  if (data.imagen_principal) {
    images.push({ url: data.imagen_principal, alt: data.nombre, is_primary: true, sort_order: 0 });
  }
  [data.imagen_2, data.imagen_3, data.imagen_4, data.imagen_5].forEach((url, idx) => {
    if (url) images.push({ url, alt: `${data.nombre} - Imagen ${idx + 2}`, is_primary: false, sort_order: idx + 1 });
  });

  const docRef = db.collection(PRODUCTS_COLLECTION).doc();
  const newProduct = {
    name: data.nombre,
    slug,
    description: data.descripcion || '',
    short_description: data.descripcion_corta || '',
    price: price,
    compare_price: data.precio_comparacion ? parseFloat(data.precio_comparacion) : null,
    cost_price: data.precio_costo ? parseFloat(data.precio_costo) : null,
    sku: data.sku || null,
    barcode: data.codigo_barras || null,
    stock_quantity: toNum(data.cantidad_stock, 0),
    low_stock_threshold: toNum(data.minimo_stock, 5),
    allow_backorders: permitir_pedidos_pendientes,
    category_id: categoryId,
    brand_id: brandId,
    is_active: activo,
    is_featured: destacado,
    is_bestseller: bestseller,
    weight_grams: data.peso_gramos ? parseFloat(data.peso_gramos) : null,
    dimensions_cm: dimensions,
    meta_title: data.meta_titulo || null,
    meta_description: data.meta_descripcion || null,
    meta_keywords: data.meta_palabras_clave || null,
    images,
    image: images[0]?.url || '',
    features: [],
    created_at: now,
    updated_at: now
  };

  await docRef.set(newProduct);

  return {
    success: true,
    product: {
      id: docRef.id,
      name: newProduct.name,
      slug: newProduct.slug,
      price: newProduct.price
    }
  };
}
