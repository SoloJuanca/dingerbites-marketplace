export const TCG_SLUG = 'tcg';
export const CATALOG_MODE_TCG = 'tcg';
export const CATALOG_MODE_GENERAL = 'general';

export function normalizeCatalogFilters(rawParams = {}) {
  const safeParams =
    typeof rawParams?.get === 'function'
      ? Object.fromEntries(rawParams.entries())
      : rawParams || {};

  let mode =
    safeParams.mode === CATALOG_MODE_TCG ? CATALOG_MODE_TCG : CATALOG_MODE_GENERAL;
  let category = safeParams.category || '';

  if (mode === CATALOG_MODE_GENERAL && category) {
    const slugs = category
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (slugs.includes(TCG_SLUG)) {
      mode = CATALOG_MODE_TCG;
      category = slugs.filter((slug) => slug !== TCG_SLUG).join(',');
    }
  }

  if (mode === CATALOG_MODE_TCG) {
    category = '';
  }

  return {
    mode,
    currentPage: parseInt(safeParams.page, 10) || 1,
    category,
    subcategory: mode === CATALOG_MODE_TCG ? '' : safeParams.subcategory || '',
    tcgCategoryId: safeParams.tcgCategoryId || '',
    tcgGroupId: safeParams.tcgGroupId || '',
    manufacturerBrand: safeParams.manufacturerBrand || '',
    franchiseBrand: safeParams.franchiseBrand || '',
    brand: safeParams.brand || '',
    condition: safeParams.condition || '',
    minPrice: safeParams.minPrice || '',
    maxPrice: safeParams.maxPrice || '',
    sortBy: safeParams.sortBy || 'newest',
    search: safeParams.q || safeParams.search || '',
    inStockOnly: safeParams.inStockOnly ?? 'true'
  };
}

export function toSearchFilters(filters) {
  return {
    page: filters.currentPage,
    limit: 12,
    mode: filters.mode,
    category: filters.category,
    subcategory: filters.subcategory,
    tcgCategoryId: filters.tcgCategoryId,
    tcgGroupId: filters.tcgGroupId,
    manufacturerBrand: filters.manufacturerBrand,
    franchiseBrand: filters.franchiseBrand,
    brand: filters.brand,
    condition: filters.condition,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sortBy: filters.sortBy,
    q: filters.search,
    inStockOnly: filters.inStockOnly
  };
}

export function getCategoryCatalogHref(slug) {
  if (!slug) return '/catalog';
  if (slug === TCG_SLUG) return '/catalog?mode=tcg';
  return `/catalog?category=${encodeURIComponent(slug)}`;
}

export function filterCategoriesForDisplay(categories = [], facetCounts = {}, options = {}) {
  const { excludeTcg = false } = options;
  const categoryCounts = facetCounts.categoryCounts || {};
  const subcategoryCounts = facetCounts.subcategoryCounts || {};

  if (!Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  const byParent = categories.reduce((map, category) => {
    const parentId = category.parent_id || null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId).push(category);
    return map;
  }, new Map());

  const rootHasStock = (category) => {
    const directCount = categoryCounts[category.slug] || 0;
    if (directCount > 0) return true;
    const children = byParent.get(category.id) || [];
    return children.some((child) => (subcategoryCounts[child.slug] || 0) > 0);
  };

  return categories.filter((category) => {
    if (excludeTcg && category.slug === TCG_SLUG) return false;
    if (category.parent_id) {
      return (subcategoryCounts[category.slug] || 0) > 0;
    }
    return rootHasStock(category);
  });
}
