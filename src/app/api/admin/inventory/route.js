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
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const stockStatus = searchParams.get('stockStatus') || 'all';
    
    const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
    let products = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((p) => p.is_active !== false);

    if (search) {
      const term = search.toLowerCase();
      products = products.filter((p) =>
        `${p.name || ''} ${p.sku || ''} ${p.description || ''}`.toLowerCase().includes(term)
      );
    }

    if (category) {
      products = products.filter((p) => String(p.category_id || '') === String(category));
    }

    if (brand) {
      products = products.filter((p) => String(p.brand_id || '') === String(brand));
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
        stock_quantity: toNumber(p.stock_quantity, 0),
        low_stock_threshold: toNumber(p.low_stock_threshold, 5),
        category_name: p.category_id ? categoriesById.get(String(p.category_id))?.name || null : null,
        brand_name: p.brand_id ? brandsById.get(String(p.brand_id))?.name || null : null,
        image_url:
          p.image ||
          (Array.isArray(p.images) && p.images.length > 0 ? p.images[0]?.url || p.images[0] : '') ||
          ''
      }))
      .sort((a, b) => {
        const byStock = a.stock_quantity - b.stock_quantity;
        if (byStock !== 0) return byStock;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

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
