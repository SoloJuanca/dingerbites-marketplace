import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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

function getArrayParams(searchParams, key) {
  const all = searchParams.getAll(key).map(String).filter((v) => v !== '');
  if (all.length > 0) return all;
  const single = searchParams.get(key);
  return single ? [String(single)] : [];
}

function countBy(items, getter) {
  const counts = {};
  items.forEach((item) => {
    const key = getter(item);
    if (key === null || key === undefined || key === '') return;
    const k = String(key);
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

// GET /api/admin/inventory - Get inventory data with stats and filtering
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
    const categories = getArrayParams(searchParams, 'category');
    const subcategories = getArrayParams(searchParams, 'subcategory');
    const tcgCategoryIds = getArrayParams(searchParams, 'tcgCategoryId');
    const tcgGroupIds = getArrayParams(searchParams, 'tcgGroupId');
    const manufacturerBrands = getArrayParams(searchParams, 'manufacturerBrand');
    const franchiseBrands = getArrayParams(searchParams, 'franchiseBrand');
    const brand = searchParams.get('brand') || '';
    const stockStatus = searchParams.get('stockStatus') || 'all';
    const orderBy = searchParams.get('orderBy') || 'date_desc';
    
    const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
    let products = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((p) => p.is_active !== false);

    // Enrich with category/brand names first so search can match them
    const initialCategoryIds = [
      ...new Set(
        products
          .flatMap((p) => [p.category_id, p.subcategory_id])
          .filter(Boolean)
      )
    ];
    const initialBrandIds = [
      ...new Set(
        products
          .flatMap((p) => [p.manufacturer_brand_id, p.franchise_brand_id, p.brand_id])
          .filter(Boolean)
      )
    ];

    const [initialCategoryDocs, initialBrandDocs] = await Promise.all([
      Promise.all(initialCategoryIds.map((id) => db.collection(CATEGORIES_COLLECTION).doc(String(id)).get())),
      Promise.all(initialBrandIds.map((id) => db.collection(BRANDS_COLLECTION).doc(String(id)).get()))
    ]);

    const categoriesById = new Map(
      initialCategoryDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()])
    );
    const brandsById = new Map(
      initialBrandDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()])
    );

    products = products.map((p) => ({
      ...p,
      stock_quantity: toNumber(p.stock_quantity, 0),
      low_stock_threshold: toNumber(p.low_stock_threshold, 5),
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
    }));

    if (search) {
      const term = search.toLowerCase();
      products = products.filter((p) => {
        const haystack = [
          p.name,
          p.sku,
          p.description,
          p.short_description,
          p.category_name,
          p.subcategory_name,
          p.brand_name,
          p.manufacturer_brand_name,
          p.franchise_brand_name,
          Array.isArray(p.features) ? p.features.join(' ') : ''
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    if (categories.length > 0) {
      const set = new Set(categories.map(String));
      products = products.filter((p) => set.has(String(p.category_id || '')));
    }

    if (subcategories.length > 0) {
      const set = new Set(subcategories.map(String));
      products = products.filter((p) => set.has(String(p.subcategory_id || '')));
    }

    // Extra filtering for TCG products (only applied if provided)
    if (tcgCategoryIds.length > 0) {
      const set = new Set(tcgCategoryIds.map(String));
      products = products.filter((p) => set.has(String(p.tcg_category_id || '')));
    }

    if (tcgGroupIds.length > 0) {
      const set = new Set(tcgGroupIds.map(String));
      products = products.filter((p) => set.has(String(p.tcg_group_id || '')));
    }

    if (manufacturerBrands.length > 0) {
      const set = new Set(manufacturerBrands.map(String));
      products = products.filter((p) => set.has(String(p.manufacturer_brand_id || '')));
    }

    if (franchiseBrands.length > 0) {
      const set = new Set(franchiseBrands.map(String));
      products = products.filter((p) => set.has(String(p.franchise_brand_id || '')));
    }

    if (brand) {
      products = products.filter(
        (p) =>
          String(p.brand_id || '') === String(brand) ||
          String(p.manufacturer_brand_id || '') === String(brand) ||
          String(p.franchise_brand_id || '') === String(brand)
      );
    }

    if (stockStatus === 'out_of_stock') {
      products = products.filter((p) => toNumber(p.stock_quantity, 0) === 0);
    } else if (stockStatus === 'low_stock') {
      products = products.filter((p) => {
        const stock = toNumber(p.stock_quantity, 0);
        const threshold = toNumber(p.low_stock_threshold, 5);
        return stock > 0 && stock <= threshold;
      });
    } else if (stockStatus === 'in_stock') {
      products = products.filter((p) => {
        const stock = toNumber(p.stock_quantity, 0);
        const threshold = toNumber(p.low_stock_threshold, 5);
        return stock > threshold;
      });
    }

    const getDateTs = (p) => {
      const raw = p.updated_at || p.created_at || '';
      const t = raw ? new Date(raw).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };

    const compareByOrderBy = (a, b) => {
      switch (orderBy) {
        case 'price_asc':
          return toNumber(a.price, 0) - toNumber(b.price, 0);
        case 'price_desc':
          return toNumber(b.price, 0) - toNumber(a.price, 0);
        case 'name_asc':
          return String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' });
        case 'name_desc':
          return String(b.name || '').localeCompare(String(a.name || ''), 'es', { sensitivity: 'base' });
        case 'date_asc':
          return getDateTs(a) - getDateTs(b);
        case 'date_desc':
        default:
          return getDateTs(b) - getDateTs(a);
      }
    };

    products.sort((a, b) => {
      const primary = compareByOrderBy(a, b);
      if (primary !== 0) return primary;
      // Tie-breaker stable-ish: name asc then id
      const byName = String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' });
      if (byName !== 0) return byName;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    const facets = {
      category: countBy(products, (p) => p.category_id),
      subcategory: countBy(products, (p) => p.subcategory_id),
      manufacturerBrand: countBy(products, (p) => p.manufacturer_brand_id),
      franchiseBrand: countBy(products, (p) => p.franchise_brand_id),
      tcgCategoryId: countBy(products, (p) => p.tcg_category_id),
      tcgGroupId: countBy(products, (p) => p.tcg_group_id)
    };

    const { data, pagination } = paginate(products, page, limit);

    const stats = products.reduce(
      (acc, product) => {
        const stock = toNumber(product.stock_quantity, 0);
        const threshold = toNumber(product.low_stock_threshold, 5);
        const price = toNumber(product.price, 0);
        const cost = product.cost_price !== null && product.cost_price !== undefined
          ? toNumber(product.cost_price, 0)
          : price * 0.6;

        acc.totalProducts += 1;
        acc.totalInvestment += cost * stock;
        if (stock === 0) acc.outOfStockItems += 1;
        else if (stock <= threshold) acc.lowStockItems += 1;
        return acc;
      },
      {
        totalInvestment: 0,
        totalProducts: 0,
        lowStockItems: 0,
        outOfStockItems: 0
      }
    );

    return NextResponse.json({
      success: true,
      products: data,
      stats,
      facets,
      pagination
    });

  } catch (error) {
    console.error('Error fetching inventory data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}
