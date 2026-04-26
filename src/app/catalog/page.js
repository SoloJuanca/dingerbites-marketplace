import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import CatalogClient from '../../components/Catalog/CatalogClient';
import { getCategories, getBrands, getPriceRange } from '../../lib/firebaseProducts';
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS } from '../../lib/productCondition';
import { searchProducts } from '../../lib/search/typesenseSearch';

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
    Boolean(sp?.page);

  return {
    title: 'Catálogo de productos',
    description: 'Explora nuestro catálogo de productos con filtros inteligentes y búsqueda avanzada.',
    alternates: {
      canonical: '/catalog'
    },
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true }
  };
}

function normalizeFilters(searchParams) {
  const safeParams = searchParams || {};
  return {
    currentPage: parseInt(safeParams.page, 10) || 1,
    category: safeParams.category || '',
    subcategory: safeParams.subcategory || '',
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

export default async function CatalogPage({ searchParams }) {
  const sp = await searchParams;
  const filters = normalizeFilters(sp);

  const [categories, manufacturerBrands, franchiseBrands, priceRange, initialResult] = await Promise.all([
    getCategories(),
    getBrands({ type: 'manufacturer' }),
    getBrands({ type: 'franchise' }),
    getPriceRange(),
    searchProducts(
      {
        page: filters.currentPage,
        limit: 12,
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
      },
      { allowFallback: true }
    )
  ]);

  const conditions = PRODUCT_CONDITIONS.map((value) => ({
    value,
    label: PRODUCT_CONDITION_LABELS[value]
  }));

  return (
    <>
      <Header />
      <CatalogClient
        categories={categories}
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