import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';
import { getTcgMinPriceForSubType } from './currency';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';
const ORDERS_COLLECTION = 'orders';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop&crop=center';

function toNum(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Public catalog: list active categories in hierarchical order (parents first, then subcategories). */
export async function getCategories() {
  try {
    const snapshot = await db.collection(CATEGORIES_COLLECTION).get();
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    items = items.filter((c) => c.is_active !== false);
    const sortFn = (a, b) => {
      const soA = toNum(a.sort_order, 0);
      const soB = toNum(b.sort_order, 0);
      if (soA !== soB) return soA - soB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    };
    items.sort(sortFn);

    function flattenTree(parentId, list) {
      return items
        .filter((c) => (c.parent_id || null) === parentId)
        .sort(sortFn)
        .flatMap((c) => [
          {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || null,
            image: c.image_url || DEFAULT_IMAGE,
            parent_id: c.parent_id || null
          },
          ...flattenTree(c.id, list)
        ]);
    }

    return flattenTree(null, items);
  } catch (err) {
    console.error('Error getting categories (Firestore):', err);
    return [];
  }
}

/** Public catalog: list active brands (same shape as lib/products getBrands). */
export async function getBrands() {
  try {
    const snapshot = await db.collection(BRANDS_COLLECTION).get();
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    items = items.filter((b) => b.is_active !== false);
    items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    return items.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description || null,
      logo: b.logo_url || null
    }));
  } catch (err) {
    console.error('Error getting brands (Firestore):', err);
    return [];
  }
}

/** Public catalog: min/max price of active products. */
export async function getPriceRange() {
  try {
    const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
    let prices = snapshot.docs
      .map((d) => d.data())
      .filter((p) => p.is_active !== false && p.price != null)
      .map((p) => toNum(p.price, 0));
    if (prices.length === 0) return { min: 0, max: 1000 };
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  } catch (err) {
    console.error('Error getting price range (Firestore):', err);
    return { min: 0, max: 1000 };
  }
}

/** Resolve category slugs to ids and brand slugs to ids. */
async function resolveCategoryAndBrandSlugs(categorySlugs, brandSlugs) {
  const [catSnap, brandSnap] = await Promise.all([
    db.collection(CATEGORIES_COLLECTION).get(),
    db.collection(BRANDS_COLLECTION).get()
  ]);
  const categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const slugToCategoryId = new Map();
  const childrenByParentId = new Map();

  categories.forEach((category) => {
    if (category.slug) {
      slugToCategoryId.set(category.slug, category.id);
    }
    const parentId = category.parent_id || null;
    if (!childrenByParentId.has(parentId)) {
      childrenByParentId.set(parentId, []);
    }
    childrenByParentId.get(parentId).push(category.id);
  });

  const collectDescendantCategoryIds = (rootCategoryId) => {
    const result = new Set();
    const queue = [rootCategoryId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || result.has(currentId)) continue;
      result.add(currentId);

      const children = childrenByParentId.get(currentId) || [];
      children.forEach((childId) => {
        if (!result.has(childId)) {
          queue.push(childId);
        }
      });
    }

    return [...result];
  };

  const slugToBrandId = new Map();
  brandSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.slug) slugToBrandId.set(data.slug, d.id);
  });

  const categoryIds = [
    ...new Set(
      (categorySlugs || [])
        .map((slug) => slugToCategoryId.get(slug))
        .filter(Boolean)
        .flatMap((categoryId) => collectDescendantCategoryIds(categoryId))
    )
  ];

  const brandIds = (brandSlugs || []).map((s) => slugToBrandId.get(s)).filter(Boolean);
  return { categoryIds, brandIds, categoriesById: slugToCategoryId, brandsById: slugToBrandId };
}

/** Build category_id -> { name, slug } and brand_id -> { name, slug } for products. */
async function loadCategoryAndBrandMaps() {
  const [catSnap, brandSnap] = await Promise.all([
    db.collection(CATEGORIES_COLLECTION).get(),
    db.collection(BRANDS_COLLECTION).get()
  ]);
  const categoriesById = new Map();
  catSnap.docs.forEach((d) => {
    const data = d.data();
    categoriesById.set(d.id, { name: data.name, slug: data.slug });
  });
  const brandsById = new Map();
  brandSnap.docs.forEach((d) => {
    const data = d.data();
    brandsById.set(d.id, { name: data.name, slug: data.slug });
  });
  return { categoriesById, brandsById };
}

function getProductImage(p) {
  const images = Array.isArray(p.images)
    ? p.images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
    : [];
  return {
    images,
    image: p.image || (images[0] || DEFAULT_IMAGE)
  };
}

function mapProductToCatalogItem(p, categoriesById, brandsById) {
  const { images, image } = getProductImage(p);
  const cat = p.category_id ? categoriesById.get(p.category_id) : null;
  const brand = p.brand_id ? brandsById.get(p.brand_id) : null;
  const tcgSubTypeName = p.tcg_sub_type_name ?? null;
  const rawPrice = toNum(p.price, 0);
  const displayPrice =
    p.tcg_product_id != null ? Math.max(getTcgMinPriceForSubType(tcgSubTypeName), rawPrice) : rawPrice;

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    short_description: p.short_description,
    price: displayPrice,
    compare_price: p.compare_price != null ? toNum(p.compare_price, 0) : null,
    is_featured: Boolean(p.is_featured),
    is_bestseller: Boolean(p.is_bestseller),
    is_active: Boolean(p.is_active),
    created_at: p.created_at,
    category_name: cat?.name ?? null,
    category_slug: cat?.slug ?? null,
    brand_name: brand?.name ?? null,
    brand_slug: brand?.slug ?? null,
    image,
    images,
    tcg_product_id: p.tcg_product_id ?? null,
    tcg_sub_type_name: tcgSubTypeName,
    stock_quantity: toNum(p.stock_quantity, 0),
    allow_backorders: Boolean(p.allow_backorders)
  };
}

function hasStock(product) {
  return toNum(product.stock_quantity, 0) > 0;
}

function toValidDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Public catalog: list products with filters, pagination, sort (same shape as lib/products getProducts). */
export async function getProducts(filters = {}) {
  try {
    const page = Math.max(1, toNum(filters.page, 1));
    const limit = Math.max(1, toNum(filters.limit, 8));
    const categorySlugs = filters.category ? String(filters.category).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const brandSlugs = filters.brand ? String(filters.brand).split(',').map((s) => s.trim()).filter(Boolean) : [];
    const minPrice = filters.minPrice ? toNum(filters.minPrice, 0) : null;
    const maxPrice = filters.maxPrice ? toNum(filters.maxPrice, Infinity) : null;
    const search = (filters.search || '').trim().toLowerCase();
    const sortBy = filters.sortBy || 'newest';

    const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
    let products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    products = products.filter((p) => p.is_active !== false);

    const { categoryIds, brandIds } = await resolveCategoryAndBrandSlugs(categorySlugs, brandSlugs);
    if (categoryIds.length > 0) {
      products = products.filter((p) => p.category_id && categoryIds.includes(p.category_id));
    }
    if (brandIds.length > 0) {
      products = products.filter((p) => p.brand_id && brandIds.includes(p.brand_id));
    }
    if (minPrice != null) {
      products = products.filter((p) => toNum(p.price, 0) >= minPrice);
    }
    if (maxPrice != null && Number.isFinite(maxPrice)) {
      products = products.filter((p) => toNum(p.price, 0) <= maxPrice);
    }
    if (search) {
      products = products.filter((p) => {
        const haystack = `${p.name || ''} ${p.description || ''} ${p.short_description || ''}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    const total = products.length;
    const totalPages = Math.ceil(total / limit);
    const currentPage = page;
    const start = (page - 1) * limit;

    switch (sortBy) {
      case 'price_asc':
        products.sort((a, b) => toNum(a.price, 0) - toNum(b.price, 0));
        break;
      case 'price_desc':
        products.sort((a, b) => toNum(b.price, 0) - toNum(a.price, 0));
        break;
      case 'name_asc':
        products.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        break;
      case 'name_desc':
        products.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
        break;
      case 'newest':
      default:
        products.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        break;
    }

    const pageProducts = products.slice(start, start + limit);
    const { categoriesById, brandsById } = await loadCategoryAndBrandMaps();

    const items = pageProducts.map((p) => mapProductToCatalogItem(p, categoriesById, brandsById));

    return {
      products: items,
      total,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  } catch (err) {
    console.error('Error getting products (Firestore):', err);
    return {
      products: [],
      total: 0,
      totalPages: 0,
      currentPage: 1,
      hasNextPage: false,
      hasPrevPage: false
    };
  }
}

export async function getNewestProducts({ limit = 8, inStockOnly = true } = {}) {
  try {
    const safeLimit = Math.max(1, Number(limit) || 8);
    const snapshot = await db.collection(PRODUCTS_COLLECTION).get();
    let products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    products = products.filter((p) => p.is_active !== false);

    if (inStockOnly) {
      products = products.filter(hasStock);
    }

    products.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const { categoriesById, brandsById } = await loadCategoryAndBrandMaps();
    return products.slice(0, safeLimit).map((product) => mapProductToCatalogItem(product, categoriesById, brandsById));
  } catch (err) {
    console.error('Error getting newest products (Firestore):', err);
    return [];
  }
}

export async function getPopularProducts({ limit = 8, inStockOnly = true, windowDays = 30 } = {}) {
  try {
    const safeLimit = Math.max(1, Number(limit) || 8);
    const safeWindowDays = Math.max(1, Number(windowDays) || 30);
    const cutoffMs = Date.now() - (safeWindowDays * 24 * 60 * 60 * 1000);
    const useObservability = true;
    const weights = {
      sold: 0.6,
      revenue: 0.25,
      views: 0.15
    };
    const tcgPriorityMultiplier = 0.72;

    const [productsSnap, ordersSnap] = await Promise.all([
      db.collection(PRODUCTS_COLLECTION).get(),
      db.collection(ORDERS_COLLECTION).get()
    ]);

    let products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    products = products.filter((p) => p.is_active !== false);
    if (inStockOnly) {
      products = products.filter(hasStock);
    }

    const productsById = new Map(products.map((p) => [String(p.id), p]));
    const scoreByProductId = new Map();

    for (const orderDoc of ordersSnap.docs) {
      const order = orderDoc.data();
      const createdAt = toValidDate(order.created_at);
      if (!createdAt || createdAt.getTime() < cutoffMs) {
        continue;
      }

      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const productId = String(item.product_id || item.id || '');
        if (!productId || !productsById.has(productId)) {
          continue;
        }

        const quantity = Math.max(1, toNum(item.quantity, 1));
        const unitPrice = toNum(item.unit_price, toNum(productsById.get(productId)?.price, 0));
        const current = scoreByProductId.get(productId) || { sold: 0, revenue: 0, views: 0 };
        current.sold += quantity;
        current.revenue += quantity * unitPrice;
        scoreByProductId.set(productId, current);
      }
    }

    const maxSold = Math.max(
      1,
      ...[...scoreByProductId.values()].map((value) => toNum(value.sold, 0))
    );
    const maxRevenue = Math.max(
      1,
      ...[...scoreByProductId.values()].map((value) => toNum(value.revenue, 0))
    );
    const maxViews = Math.max(
      1,
      ...products.map((product) => toNum(product.view_count, 0))
    );

    const rankedByPopularity = [...products]
      .map((product) => {
        const productId = String(product.id);
        const orderStats = scoreByProductId.get(productId) || { sold: 0, revenue: 0, views: 0 };
        const soldSignal = toNum(orderStats.sold, 0) / maxSold;
        const revenueSignal = toNum(orderStats.revenue, 0) / maxRevenue;
        const viewsSignal = useObservability ? toNum(product.view_count, 0) / maxViews : 0;

        const baseScore =
          soldSignal * weights.sold +
          revenueSignal * weights.revenue +
          viewsSignal * weights.views;

        const isTcgProduct = product.tcg_product_id != null;
        const adjustedScore = isTcgProduct ? baseScore * tcgPriorityMultiplier : baseScore;

        return { product, score: adjustedScore };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);

    const selected = [];
    const seen = new Set();

    const pushUnique = (list) => {
      for (const product of list) {
        if (!product || seen.has(product.id)) continue;
        selected.push(product);
        seen.add(product.id);
        if (selected.length >= safeLimit) break;
      }
    };

    pushUnique(rankedByPopularity);

    if (selected.length < safeLimit) {
      const bestsellers = products
        .filter((p) => Boolean(p.is_bestseller))
        .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
      pushUnique(bestsellers);
    }

    if (selected.length < safeLimit) {
      const newest = [...products]
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      pushUnique(newest);
    }

    const { categoriesById, brandsById } = await loadCategoryAndBrandMaps();
    return selected.slice(0, safeLimit).map((product) => mapProductToCatalogItem(product, categoriesById, brandsById));
  } catch (err) {
    console.error('Error getting popular products (Firestore):', err);
    return [];
  }
}

export async function incrementProductViewCount(productId) {
  try {
    if (!productId) return;
    await db.collection(PRODUCTS_COLLECTION).doc(String(productId)).update({
      view_count: FieldValue.increment(1),
      last_viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error incrementing product view count:', err);
  }
}

export async function getFeaturedCategoryProducts(categorySlugs = [], { perCategory = 4, inStockOnly = true } = {}) {
  try {
    const normalizedSlugs = Array.isArray(categorySlugs)
      ? categorySlugs.map((slug) => String(slug || '').trim().toLowerCase()).filter(Boolean)
      : [];

    if (normalizedSlugs.length === 0) return [];

    const [categoriesSnap, productsSnap] = await Promise.all([
      db.collection(CATEGORIES_COLLECTION).get(),
      db.collection(PRODUCTS_COLLECTION).get()
    ]);

    const categories = categoriesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const categoriesBySlug = new Map(
      categories.map((category) => [String(category.slug || '').toLowerCase(), category])
    );

    let products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    products = products.filter((p) => p.is_active !== false);
    if (inStockOnly) {
      products = products.filter(hasStock);
    }

    const { categoriesById, brandsById } = await loadCategoryAndBrandMaps();
    const safePerCategory = Math.max(1, Number(perCategory) || 4);

    return normalizedSlugs.map((slug) => {
      const category = categoriesBySlug.get(slug);
      if (!category) {
        return {
          id: slug,
          slug,
          name: slug,
          image_url: '',
          products: []
        };
      }

      const categoryProducts = products
        .filter((product) => product.category_id === category.id)
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, safePerCategory)
        .map((product) => mapProductToCatalogItem(product, categoriesById, brandsById));

      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        image_url: category.image_url || '',
        products: categoryProducts
      };
    });
  } catch (err) {
    console.error('Error getting featured category products (Firestore):', err);
    return [];
  }
}

/** Public catalog: get single product by slug (same shape as lib/products getProductBySlug). */
export async function getProductBySlug(slug) {
  try {
    const snapshot = await db
      .collection(PRODUCTS_COLLECTION)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const p = { id: doc.id, ...doc.data() };
    if (p.is_active === false) return null;

    const images = Array.isArray(p.images)
      ? p.images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
      : [];
    const features = Array.isArray(p.features) ? p.features : [];

    let category_name = null;
    let category_slug = null;
    let brand_name = null;
    let brand_slug = null;
    if (p.category_id) {
      const catDoc = await db.collection(CATEGORIES_COLLECTION).doc(p.category_id).get();
      if (catDoc.exists) {
        const d = catDoc.data();
        category_name = d.name;
        category_slug = d.slug;
      }
    }
    if (p.brand_id) {
      const brandDoc = await db.collection(BRANDS_COLLECTION).doc(p.brand_id).get();
      if (brandDoc.exists) {
        const d = brandDoc.data();
        brand_name = d.name;
        brand_slug = d.slug;
      }
    }

    const tcgSubTypeName = p.tcg_sub_type_name ?? null;
    const rawPrice = toNum(p.price, 0);
    const displayPrice =
      p.tcg_product_id != null ? Math.max(getTcgMinPriceForSubType(tcgSubTypeName), rawPrice) : rawPrice;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      short_description: p.short_description,
      price: displayPrice,
      compare_price: p.compare_price != null ? toNum(p.compare_price, 0) : null,
      is_featured: Boolean(p.is_featured),
      is_active: Boolean(p.is_active),
      created_at: p.created_at,
      category_name,
      category_slug,
      brand_name,
      brand_slug,
      brand: brand_name,
      category: category_slug,
      images,
      image: images[0] || null,
      features,
      tcg_product_id: p.tcg_product_id ?? null,
      tcg_sub_type_name: tcgSubTypeName,
      stock_quantity: toNum(p.stock_quantity, 0),
      low_stock_threshold: toNum(p.low_stock_threshold, 0),
      allow_backorders: Boolean(p.allow_backorders)
    };
  } catch (err) {
    console.error('Error getting product by slug (Firestore):', err);
    return null;
  }
}
