import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';

function paginate(items, page, limit) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const total = items.length;
  const totalPages = Math.ceil(total / safeLimit);
  const start = (safePage - 1) * safeLimit;
  const data = items.slice(start, start + safeLimit);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages
    }
  };
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// GET /api/admin/products - Get all products with filters
export async function GET(request) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const status = searchParams.get('status') || 'all';
    
    const productSnapshot = await db.collection(PRODUCTS_COLLECTION).get();
    let products = productSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    if (search) {
      const term = search.toLowerCase();
      products = products.filter((p) => {
        const haystack = `${p.name || ''} ${p.sku || ''} ${p.barcode || ''} ${p.description || ''}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    if (category) {
      products = products.filter((p) => String(p.category_id || '') === String(category));
    }

    if (brand) {
      products = products.filter((p) => String(p.brand_id || '') === String(brand));
    }

    if (status !== 'all') {
      const isActive = status === 'active';
      products = products.filter((p) => Boolean(p.is_active) === isActive);
    }

    const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))];
    const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))];

    const [categoryDocs, brandDocs] = await Promise.all([
      Promise.all(categoryIds.map((id) => db.collection(CATEGORIES_COLLECTION).doc(String(id)).get())),
      Promise.all(brandIds.map((id) => db.collection(BRANDS_COLLECTION).doc(String(id)).get()))
    ]);

    const categoriesById = new Map(categoryDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));
    const brandsById = new Map(brandDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));

    products = products
      .map((p) => ({
        ...p,
        category_name: p.category_id ? categoriesById.get(String(p.category_id))?.name || null : null,
        brand_name: p.brand_id ? brandsById.get(String(p.brand_id))?.name || null : null,
        image_url:
          p.image ||
          (Array.isArray(p.images) && p.images.length > 0 ? p.images[0]?.url || p.images[0] : '') ||
          ''
      }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const { data, pagination } = paginate(products, page, limit);

    return NextResponse.json({
      success: true,
      products: data,
      pagination
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Create new product
export async function POST(request) {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      short_description,
      price,
      compare_price,
      cost_price,
      sku,
      barcode,
      weight_grams,
      dimensions_cm,
      category_id,
      brand_id,
      stock_quantity,
      low_stock_threshold,
      allow_backorders,
      is_active,
      is_featured,
      is_bestseller,
      meta_title,
      meta_description,
      meta_keywords,
      images,
      features
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Price is only required for active products (published)
    if (is_active && (!price || parseFloat(price) <= 0)) {
      return NextResponse.json(
        { error: 'Price is required for published products' },
        { status: 400 }
      );
    }

    const existingProductSnapshot = await db
      .collection(PRODUCTS_COLLECTION)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    const existingProduct = !existingProductSnapshot.empty ? existingProductSnapshot.docs[0] : null;

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const normalizedImages = Array.isArray(images)
      ? images
          .map((img, idx) => {
            if (typeof img === 'string') {
              return { url: img, alt: '', is_primary: idx === 0, sort_order: idx };
            }
            if (img?.url) {
              return {
                url: img.url,
                alt: img.alt || img.name || '',
                is_primary: idx === 0,
                sort_order: idx
              };
            }
            return null;
          })
          .filter(Boolean)
      : [];

    const docRef = db.collection(PRODUCTS_COLLECTION).doc();
    const newProduct = {
      id: docRef.id,
      name,
      slug,
      description: description || '',
      short_description: short_description || '',
      price: toNumber(price, 0),
      compare_price: compare_price !== undefined ? toNumber(compare_price, 0) : null,
      cost_price: cost_price !== undefined ? toNumber(cost_price, 0) : null,
      sku: sku || null,
      barcode: barcode || null,
      weight_grams: weight_grams !== undefined ? toNumber(weight_grams, 0) : null,
      dimensions_cm: dimensions_cm || null,
      category_id: category_id || null,
      brand_id: brand_id || null,
      stock_quantity: toNumber(stock_quantity, 0),
      low_stock_threshold: toNumber(low_stock_threshold, 5),
      allow_backorders: Boolean(allow_backorders),
      is_active: is_active !== undefined ? Boolean(is_active) : false,
      is_featured: Boolean(is_featured),
      is_bestseller: Boolean(is_bestseller),
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      meta_keywords: meta_keywords || null,
      features: Array.isArray(features) ? features : [],
      images: normalizedImages,
      image: normalizedImages[0]?.url || '',
      created_at: now,
      updated_at: now
    };

    await docRef.set(newProduct);

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
