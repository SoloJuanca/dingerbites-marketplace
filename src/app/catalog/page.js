import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import CatalogClient from '../../components/Catalog/CatalogClient';
import { getCategories, getBrands, getPriceRange } from '../../lib/firebaseProducts';
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS } from '../../lib/productCondition';
import { filterCategoriesForDisplay, normalizeCatalogFilters, toSearchFilters } from '../../lib/catalogFilters';
import { searchProducts, getCategoryFacetCounts } from '../../lib/search/typesenseSearch';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const hasFilters =
    Boolean(sp?.q) ||
    Boolean(sp?.search) ||
    Boolean(sp?.subcategory) ||
    Boolean(sp?.manufacturerBrand) ||
    Boolean(sp?.franchiseBrand) ||
    Boolean(sp?.brand) ||
    Boolean(sp?.condition) ||
    Boolean(sp?.minPrice) ||
    Boolean(sp?.maxPrice) ||
    Boolean(sp?.page) ||
    Boolean(sp?.mode);

  return {
    title: 'Catálogo de productos',
    description: 'Explora nuestro catálogo de productos con filtros inteligentes y búsqueda avanzada.',
    alternates: {
      canonical: '/catalog'
    },
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true }
  };
}

export default async function CatalogPage({ searchParams }) {
  const sp = await searchParams;
  const filters = normalizeCatalogFilters(sp);

  const [categories, manufacturerBrands, franchiseBrands, priceRange, facetCounts, initialResult] =
    await Promise.all([
      getCategories(),
      getBrands({ type: 'manufacturer' }),
      getBrands({ type: 'franchise' }),
      getPriceRange(),
      getCategoryFacetCounts({ inStockOnly: true }),
      searchProducts(toSearchFilters(filters), { allowFallback: true })
    ]);

  const visibleCategories = filterCategoriesForDisplay(categories, facetCounts, {
    excludeTcg: filters.mode !== 'tcg'
  });

  const conditions = PRODUCT_CONDITIONS.map((value) => ({
    value,
    label: PRODUCT_CONDITION_LABELS[value]
  }));

  return (
    <>
      <Header />
      <CatalogClient
        categories={visibleCategories}
        manufacturerBrands={manufacturerBrands}
        franchiseBrands={franchiseBrands}
        conditions={conditions}
        priceRange={priceRange}
        filters={filters}
        initialResult={initialResult}
      />
      <Footer />
    </>
  );
}
