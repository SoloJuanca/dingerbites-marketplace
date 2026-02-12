import { db } from './firebaseAdmin';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop&crop=center';

function toNum(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Public catalog: list active categories (same shape as lib/products getCategories). */
export async function getCategories() {
  try {
    const snapshot = await db.collection(CATEGORIES_COLLECTION).get();
    let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    items = items.filter((c) => c.is_active !== false);
    items.sort((a, b) => {
      const soA = toNum(a.sort_order, 0);
      const soB = toNum(b.sort_order, 0);
      if (soA !== soB) return soA - soB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return items.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      image: c.image_url || DEFAULT_IMAGE
    }));
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
  const slugToCategoryId = new Map();
  catSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.slug) slugToCategoryId.set(data.slug, d.id);
  });
  const slugToBrandId = new Map();
  brandSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.slug) slugToBrandId.set(data.slug, d.id);
  });
  const categoryIds = (categorySlugs || [])
    .map((s) => slugToCategoryId.get(s))
    .filter(Boolean);
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

    const items = pageProducts.map((p) => {
      const images = Array.isArray(p.images)
        ? p.images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean)
        : [];
      const image = p.image || (images[0] || DEFAULT_IMAGE);
      const cat = p.category_id ? categoriesById.get(p.category_id) : null;
      const brand = p.brand_id ? brandsById.get(p.brand_id) : null;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        short_description: p.short_description,
        price: toNum(p.price, 0),
        compare_price: p.compare_price != null ? toNum(p.compare_price, 0) : null,
        is_featured: Boolean(p.is_featured),
        is_active: Boolean(p.is_active),
        created_at: p.created_at,
        category_name: cat?.name ?? null,
        category_slug: cat?.slug ?? null,
        brand_name: brand?.name ?? null,
        brand_slug: brand?.slug ?? null,
        image,
        images
      };
    });

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

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      short_description: p.short_description,
      price: toNum(p.price, 0),
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
      features
    };
  } catch (err) {
    console.error('Error getting product by slug (Firestore):', err);
    return null;
  }
}
