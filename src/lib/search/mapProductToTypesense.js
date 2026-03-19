function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTimestamp(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function mapProductToTypesense(product, lookup = {}) {
  const categoriesById = lookup.categoriesById || new Map();
  const brandsById = lookup.brandsById || new Map();

  const category = product.category_id ? categoriesById.get(String(product.category_id)) : null;
  const subcategory = product.subcategory_id ? categoriesById.get(String(product.subcategory_id)) : null;
  const manufacturerBrand = product.manufacturer_brand_id
    ? brandsById.get(String(product.manufacturer_brand_id))
    : null;
  const franchiseBrand = product.franchise_brand_id ? brandsById.get(String(product.franchise_brand_id)) : null;
  const legacyBrand = product.brand_id ? brandsById.get(String(product.brand_id)) : null;
  const brand = franchiseBrand || manufacturerBrand || legacyBrand || null;

  const name = String(product.name || '');
  const description = String(product.description || '');
  const shortDescription = String(product.short_description || '');
  const tags = Array.isArray(product.tags)
    ? product.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : [];

  const searchBlob = [
    name,
    description,
    shortDescription,
    String(product.sku || ''),
    String(product.barcode || ''),
    String(brand?.name || ''),
    String(category?.name || ''),
    tags.join(' ')
  ]
    .join(' ')
    .trim();

  return {
    id: String(product.id || ''),
    slug: String(product.slug || ''),
    name,
    name_normalized: normalizeText(name),
    description,
    short_description: shortDescription,
    sku: String(product.sku || ''),
    barcode: String(product.barcode || ''),
    search_blob: searchBlob,
    category_id: product.category_id ? String(product.category_id) : '',
    category_slug: category?.slug || '',
    category_name: category?.name || '',
    subcategory_id: product.subcategory_id ? String(product.subcategory_id) : '',
    subcategory_slug: subcategory?.slug || '',
    manufacturer_brand_id: product.manufacturer_brand_id ? String(product.manufacturer_brand_id) : '',
    manufacturer_brand_slug: manufacturerBrand?.slug || '',
    franchise_brand_id: product.franchise_brand_id ? String(product.franchise_brand_id) : '',
    franchise_brand_slug: franchiseBrand?.slug || '',
    brand_id: product.brand_id ? String(product.brand_id) : '',
    brand_slug: brand?.slug || '',
    brand_name: brand?.name || '',
    condition: product.condition || '',
    tags,
    price: toNumber(product.price, 0),
    stock_quantity: toNumber(product.stock_quantity, 0),
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
    is_bestseller: Boolean(product.is_bestseller),
    popularity: toNumber(product.view_count, 0),
    created_at: product.created_at || null,
    updated_at: product.updated_at || null,
    created_at_ts: toTimestamp(product.created_at),
    updated_at_ts: toTimestamp(product.updated_at),
    image:
      product.image ||
      (Array.isArray(product.images) && product.images.length > 0
        ? String(product.images[0]?.url || product.images[0] || '')
        : '')
  };
}
