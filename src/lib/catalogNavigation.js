import { CATALOG_MODE_TCG } from './catalogFilters';

export function mergeCatalogSearchParams(baseSearchParams, updates = {}) {
  const params = new URLSearchParams(
    typeof baseSearchParams?.toString === 'function'
      ? baseSearchParams.toString()
      : String(baseSearchParams || '')
  );

  params.delete('page');

  Object.entries(updates).forEach(([key, value]) => {
    if (value != null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
      const stringValue = Array.isArray(value) ? value.join(',') : String(value);
      params.set(key, stringValue);
    } else {
      params.delete(key);
    }
  });

  return params;
}

export function buildCatalogPath(params) {
  const query = params.toString();
  return query ? `/catalog?${query}` : '/catalog';
}

export function buildCatalogUrl(updates = {}, baseSearchParams = null) {
  const params = mergeCatalogSearchParams(baseSearchParams || '', updates);
  return buildCatalogPath(params);
}

export function pushCatalogFilters(router, searchParams, updates) {
  const params = mergeCatalogSearchParams(searchParams, updates);
  router.push(buildCatalogPath(params));
}

export function buildTcgCatalogUrl(preserveParams = null) {
  const params = new URLSearchParams(
    typeof preserveParams?.toString === 'function' ? preserveParams.toString() : ''
  );
  params.delete('page');
  params.delete('category');
  params.delete('subcategory');
  params.set('mode', CATALOG_MODE_TCG);
  params.set('inStockOnly', params.get('inStockOnly') || 'true');
  return buildCatalogPath(params);
}

export function buildGeneralCatalogUrl(preserveParams = null) {
  const params = new URLSearchParams(
    typeof preserveParams?.toString === 'function' ? preserveParams.toString() : ''
  );
  params.delete('page');
  params.delete('mode');
  params.delete('tcgCategoryId');
  params.delete('tcgGroupId');
  params.delete('category');
  params.delete('subcategory');
  params.set('inStockOnly', params.get('inStockOnly') || 'true');
  return buildCatalogPath(params);
}
