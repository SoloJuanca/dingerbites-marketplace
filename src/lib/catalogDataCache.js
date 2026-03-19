import { unstable_cache } from 'next/cache';
import {
  getCategories,
  getBrands,
  getPriceRange,
  getNewestProducts,
  getPopularProducts
} from './firebaseProducts';
import { searchProducts } from './search/typesenseSearch';

/** Taxonomía cambia poco: categorías y marcas. */
const REVAL_TAXONOMY = 120;

/** Rango de precios requiere escanear productos en Firestore. */
const REVAL_PRICE_RANGE = 180;

/** Resultados de listado catálogo (Typesense / fallback). */
const REVAL_CATALOG_SEARCH = 45;

/** Bloques de la home (evita recomputar popular = órdenes + productos). */
const REVAL_HOME_SECTIONS = 90;

export function getCategoriesCached() {
  return unstable_cache(async () => getCategories(), ['public-getCategories'], {
    revalidate: REVAL_TAXONOMY
  })();
}

export function getBrandsManufacturerCached() {
  return unstable_cache(async () => getBrands({ type: 'manufacturer' }), ['public-getBrands-mfg'], {
    revalidate: REVAL_TAXONOMY
  })();
}

export function getBrandsFranchiseCached() {
  return unstable_cache(async () => getBrands({ type: 'franchise' }), ['public-getBrands-franchise'], {
    revalidate: REVAL_TAXONOMY
  })();
}

export function getPriceRangeCached() {
  return unstable_cache(async () => getPriceRange(), ['public-getPriceRange'], {
    revalidate: REVAL_PRICE_RANGE
  })();
}

function catalogSearchKey(filters) {
  const q = (filters.q || filters.search || '').trim();
  return [
    String(filters.page || 1),
    String(filters.limit || 12),
    filters.category || '',
    filters.subcategory || '',
    filters.manufacturerBrand || '',
    filters.franchiseBrand || '',
    filters.brand || '',
    filters.condition || '',
    String(filters.minPrice || ''),
    String(filters.maxPrice || ''),
    filters.sortBy || 'newest',
    q
  ].join('|');
}

/**
 * Cachea por combinación de filtros. TTL corto para equilibrio frescura/velocidad.
 */
export function searchProductsForCatalogCached(filters, options = { allowFallback: true }) {
  const key = catalogSearchKey(filters);
  return unstable_cache(
    async () => searchProducts(filters, options),
    ['public-catalog-search', key],
    { revalidate: REVAL_CATALOG_SEARCH }
  )();
}

export function getNewestProductsHomeCached() {
  return unstable_cache(
    async () => getNewestProducts({ limit: 8, inStockOnly: true }),
    ['home-newest-products'],
    { revalidate: REVAL_HOME_SECTIONS }
  )();
}

export function getPopularProductsHomeCached() {
  return unstable_cache(
    async () => getPopularProducts({ limit: 8, inStockOnly: true, windowDays: 30 }),
    ['home-popular-products'],
    { revalidate: REVAL_HOME_SECTIONS }
  )();
}
