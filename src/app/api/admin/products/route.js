import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';
import { createCategory, CATEGORIES_COLLECTION, findBySlug } from '../../../../lib/firebaseCatalog';
import { isValidProductCondition, normalizeProductCondition } from '../../../../lib/productCondition';

const PRODUCTS_COLLECTION = 'products';
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
    const subcategory = searchParams.get('subcategory') || '';
    const manufacturerBrand = searchParams.get('manufacturerBrand') || '';
    const franchiseBrand = searchParams.get('franchiseBrand') || '';
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

    if (subcategory) {
      products = products.filter((p) => String(p.subcategory_id || '') === String(subcategory));
    }

    if (manufacturerBrand) {
      products = products.filter(
        (p) => String(p.manufacturer_brand_id || '') === String(manufacturerBrand)
      );
    }

    if (franchiseBrand) {
      products = products.filter(
        (p) => String(p.franchise_brand_id || '') === String(franchiseBrand)
      );
    }

    if (brand) {
      products = products.filter(
        (p) =>
          String(p.brand_id || '') === String(brand) ||
          String(p.franchise_brand_id || '') === String(brand) ||
          String(p.manufacturer_brand_id || '') === String(brand)
      );
    }

    if (status !== 'all') {
      const isActive = status === 'active';
      products = products.filter((p) => Boolean(p.is_active) === isActive);
    }

    const categoryIds = [
      ...new Set(
        products
          .flatMap((p) => [p.category_id, p.subcategory_id])
          .filter(Boolean)
      )
    ];
    const brandIds = [
      ...new Set(
        products
          .flatMap((p) => [p.manufacturer_brand_id, p.franchise_brand_id, p.brand_id])
          .filter(Boolean)
      )
    ];

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
        subcategory_name: p.subcategory_id ? categoriesById.get(String(p.subcategory_id))?.name || null : null,
        manufacturer_brand_name: p.manufacturer_brand_id
          ? brandsById.get(String(p.manufacturer_brand_id))?.name || null
          : null,
        franchise_brand_name: p.franchise_brand_id
          ? brandsById.get(String(p.franchise_brand_id))?.name || null
          : null,
        brand_name:
          (p.franchise_brand_id ? brandsById.get(String(p.franchise_brand_id))?.name : null) ||
          (p.manufacturer_brand_id ? brandsById.get(String(p.manufacturer_brand_id))?.name : null) ||
          (p.brand_id ? brandsById.get(String(p.brand_id))?.name : null) ||
          null,
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
      subcategory_id,
      manufacturer_brand_id,
      franchise_brand_id,
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
      features,
      suggested_category_name,
      condition,
      tcg_product_id,
      tcg_group_id,
      tcg_category_id,
      tcg_sub_type_name
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Price is only required for active non-TCG products (TCG products use market price)
    const isTcgProduct = tcg_product_id != null;
    if (is_active && !isTcgProduct && (!price || parseFloat(price) <= 0)) {
      return NextResponse.json(
        { error: 'Price is required for published products' },
        { status: 400 }
      );
    }

    const normalizedCondition = normalizeProductCondition(condition);
    if (!isValidProductCondition(normalizedCondition)) {
      return NextResponse.json(
        { error: 'Condition must be one of: nuevo sellado, nuevo abierto, segunda mano' },
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

    let finalCategoryId = category_id || null;
    let finalSubcategoryId = subcategory_id || null;

    if (!finalCategoryId && suggested_category_name && suggested_category_name.trim()) {
      const normalizedName = suggested_category_name.trim();
      const slugBase = normalizedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

      const existingCategory = await findBySlug(CATEGORIES_COLLECTION, slugBase);

      if (existingCategory) {
        finalCategoryId = existingCategory.id || existingCategory.docId || null;
      } else {
        const newCategory = await createCategory({
          name: normalizedName,
          slug: slugBase,
          description: '',
          image_url: '',
          is_active: true,
          parent_id: null,
          tcg_category_id: null
        });
        finalCategoryId = newCategory.id || newCategory.docId || null;
      }
    }
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

    if (finalSubcategoryId) {
      const subcategorySnap = await db.collection(CATEGORIES_COLLECTION).doc(String(finalSubcategoryId)).get();
      if (!subcategorySnap.exists) {
        return NextResponse.json(
          { error: 'Subcategory not found' },
          { status: 400 }
        );
      }
      const subcategoryData = subcategorySnap.data();
      const subcategoryParentId = subcategoryData?.parent_id || null;
      if (!finalCategoryId || String(subcategoryParentId) !== String(finalCategoryId)) {
        return NextResponse.json(
          { error: 'Subcategory does not belong to selected category' },
          { status: 400 }
        );
      }
    }

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
      category_id: finalCategoryId,
      subcategory_id: finalSubcategoryId,
      manufacturer_brand_id: manufacturer_brand_id || null,
      franchise_brand_id: franchise_brand_id || null,
      brand_id: franchise_brand_id || manufacturer_brand_id || null,
      condition: normalizedCondition,
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
      tcg_product_id: tcg_product_id != null ? Number(tcg_product_id) : null,
      tcg_group_id: tcg_group_id != null ? Number(tcg_group_id) : null,
      tcg_category_id: tcg_category_id != null ? Number(tcg_category_id) : null,
      tcg_sub_type_name: tcg_sub_type_name || null,
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
