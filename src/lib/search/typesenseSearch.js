import { getProducts } from '../firebaseProducts';
import { getTypesenseConfig, getTypesenseServerClient, isTypesenseConfigured } from '../typesenseServer';
import { PRODUCTS_SEARCH_FIELDS } from './typesenseSchema';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildFilterBy(filters) {
  const filterList = [];
  const status = String(filters.status || '').trim();
  const includeInactive = String(filters.includeInactive || '').toLowerCase() === 'true';
  const inStockOnly = String(filters.inStockOnly || '').toLowerCase() === 'true';

  if (!includeInactive) {
    if (status === 'active') {
      filterList.push('is_active:=true');
    } else if (status === 'inactive') {
      filterList.push('is_active:=false');
    } else {
      filterList.push('is_active:=true');
    }
  } else if (status === 'active' || status === 'inactive') {
    filterList.push(`is_active:=${status === 'active' ? 'true' : 'false'}`);
  }

  const appendArrayFilter = (fieldName, value) => {
    if (!value) return;
    const values = String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (values.length === 0) return;
    const composed = values.map((item) => `${fieldName}:=\`${item}\``).join(' || ');
    filterList.push(`(${composed})`);
  };

  appendArrayFilter('category_slug', filters.category);
  appendArrayFilter('subcategory_slug', filters.subcategory);
  appendArrayFilter('manufacturer_brand_slug', filters.manufacturerBrand);
  appendArrayFilter('franchise_brand_slug', filters.franchiseBrand);
  appendArrayFilter('brand_slug', filters.brand);
  appendArrayFilter('condition', filters.condition);
  appendArrayFilter('tcg_category_id', filters.tcgCategoryId);
  appendArrayFilter('tcg_group_id', filters.tcgGroupId);

  const minPrice = filters.minPrice ? toNumber(filters.minPrice, 0) : null;
  const maxPrice = filters.maxPrice ? toNumber(filters.maxPrice, 0) : null;
  if (minPrice !== null && maxPrice !== null) {
    filterList.push(`price:[${minPrice}..${maxPrice}]`);
  } else if (minPrice !== null) {
    filterList.push(`price:>=${minPrice}`);
  } else if (maxPrice !== null) {
    filterList.push(`price:<=${maxPrice}`);
  }

  if (inStockOnly) {
    filterList.push('stock_quantity:>0');
  }

  return filterList.join(' && ');
}

function mapSortBy(sortBy) {
  switch (sortBy) {
    case 'price_asc':
    case 'price-low':
      return 'price:asc,updated_at_ts:desc';
    case 'price_desc':
    case 'price-high':
      return 'price:desc,updated_at_ts:desc';
    case 'oldest':
      return 'created_at_ts:asc';
    case 'name_asc':
      return '_text_match:desc,name:asc';
    case 'name_desc':
      return '_text_match:desc,name:desc';
    case 'newest':
    default:
      return '_text_match:desc,created_at_ts:desc';
  }
}

function normalizeTypesenseResult(result, page, limit) {
  const hits = Array.isArray(result?.hits) ? result.hits : [];
  const products = hits.map((hit) => {
    const document = hit.document || {};
    return {
      id: document.id,
      slug: document.slug,
      name: document.name,
      description: document.description || '',
      short_description: document.short_description || '',
      price: document.price || 0,
      category_slug: document.category_slug || '',
      category_name: document.category_name || '',
      subcategory_slug: document.subcategory_slug || '',
      brand_slug: document.brand_slug || '',
      brand_name: document.brand_name || '',
      manufacturer_brand_slug: document.manufacturer_brand_slug || '',
      franchise_brand_slug: document.franchise_brand_slug || '',
      condition: document.condition || '',
      image: document.image || '',
      stock_quantity: document.stock_quantity || 0,
      sku: document.sku || '',
      barcode: document.barcode || '',
      is_active: Boolean(document.is_active),
      is_featured: Boolean(document.is_featured),
      is_bestseller: Boolean(document.is_bestseller),
      created_at: document.created_at || null,
      updated_at: document.updated_at || null
    };
  });

  const total = Number(result?.found || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    products,
    total,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

export async function searchProducts(filters = {}, options = {}) {
  const shouldFallback = options.allowFallback !== false;
  const page = Math.max(1, toNumber(filters.page, 1));
  const limit = Math.max(1, toNumber(filters.limit, 12));

  if (!isTypesenseConfigured() || getTypesenseConfig().enableSearch === false) {
    if (!shouldFallback) {
      throw new Error('Typesense is not configured');
    }
    return getProducts(filters);
  }

  try {
    const client = getTypesenseServerClient();
    const { collectionName } = getTypesenseConfig();
    const query = String(filters.q || filters.search || '*').trim() || '*';
    const searchParameters = {
      q: query,
      query_by: PRODUCTS_SEARCH_FIELDS,
      page,
      per_page: limit,
      filter_by: buildFilterBy(filters),
      sort_by: mapSortBy(filters.sortBy),
      prefix: true,
      typo_tokens_threshold: 1,
      num_typos: 2,
      highlight_fields: 'name,description,brand_name,category_name'
    };
    const result = await client.collections(collectionName).documents().search(searchParameters);
    return normalizeTypesenseResult(result, page, limit);
  } catch (error) {
    if (!shouldFallback) throw error;
    console.error('Typesense search failed, using Firestore fallback:', error);
    return getProducts(filters);
  }
}

export async function getSearchSuggestions(rawQuery, filters = {}) {
  if (!isTypesenseConfigured() || getTypesenseConfig().enableSearch === false) {
    return [];
  }

  const query = String(rawQuery || '').trim();
  if (!query || query.length < 2) return [];

  const client = getTypesenseServerClient();
  const { collectionName } = getTypesenseConfig();
  const result = await client.collections(collectionName).documents().search({
    q: query,
    query_by: 'name,name_normalized,tcg_group_name,brand_name,category_name',
    filter_by: buildFilterBy(filters),
    per_page: 12,
    prefix: true,
    sort_by: '_text_match:desc,popularity:desc'
  });

  const suggestions = new Map();
  (result?.hits || []).forEach((hit) => {
    const document = hit.document || {};
    const categoryName = document.category_name || null;

    // Set/group suggestions (prefer when available)
    if (document?.tcg_group_name && document?.tcg_group_id && document?.tcg_category_id) {
      const label = String(document.tcg_group_name);
      const key = `tcg_group::${label.toLowerCase()}`;
      if (!suggestions.has(key)) {
        suggestions.set(key, {
          label,
          slug: `tcg-group-${document.tcg_category_id}-${document.tcg_group_id}`,
          category: categoryName,
          kind: 'tcg_group',
          tcgCategoryId: String(document.tcg_category_id),
          tcgGroupId: String(document.tcg_group_id)
        });
      }
    }

    // Product suggestions
    if (document?.name) {
      const label = String(document.name);
      const key = `product::${label.toLowerCase()}`;
      if (!suggestions.has(key)) {
        suggestions.set(key, {
          label,
          slug: document.slug,
          category: categoryName
        });
      }
    }
  });

  return [...suggestions.values()];
}
