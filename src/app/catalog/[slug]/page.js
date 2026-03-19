import { notFound } from 'next/navigation';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import CatalogClient from '../../../components/Catalog/CatalogClient';
import CatalogProductPage from '../../../components/CatalogProductPage/CatalogProductPage';
import { getCategories, getBrands, getPriceRange, getProductBySlug } from '../../../lib/firebaseProducts';
import { PRODUCT_CONDITIONS, PRODUCT_CONDITION_LABELS } from '../../../lib/productCondition';
import { searchProducts } from '../../../lib/search/typesenseSearch';

export const dynamic = 'force-dynamic';

function normalizeFilters(searchParams, categorySlug) {
  const safeParams = searchParams || {};
  return {
    currentPage: parseInt(safeParams.page, 10) || 1,
    category: categorySlug || '',
    subcategory: safeParams.subcategory || '',
    manufacturerBrand: safeParams.manufacturerBrand || '',
    franchiseBrand: safeParams.franchiseBrand || '',
    brand: safeParams.brand || '',
    condition: safeParams.condition || '',
    minPrice: safeParams.minPrice || '',
    maxPrice: safeParams.maxPrice || '',
    sortBy: safeParams.sortBy || 'newest',
    search: safeParams.q || safeParams.search || ''
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (product) {
    const description =
      product.short_description ||
      product.description?.replace(/<[^>]+>/g, '').slice(0, 160) ||
      `${product.name} en Dingerbites.`;
    return {
      title: product.name,
      description,
      alternates: { canonical: `/catalog/${product.slug}` },
      openGraph: {
        title: product.name,
        description,
        url: `/catalog/${product.slug}`,
        type: 'website'
      }
    };
  }

  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug && !item.parent_id);
  if (!category) {
    return { title: 'No encontrado' };
  }

  const title = `${category.name} | Catálogo`;
  const description =
    category.description ||
    `Compra ${category.name} en Dingerbites. Descubre productos actualizados, precios competitivos y envío seguro.`;
  const canonical = `/catalog/${category.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { title, description }
  };
}

export default async function CatalogSlugPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;

  const product = await getProductBySlug(slug);
  if (product) {
    return <CatalogProductPage slug={slug} />;
  }

  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug && !item.parent_id);
  if (!category) {
    notFound();
  }

  const filters = normalizeFilters(resolvedSearch, slug);

  const [manufacturerBrands, franchiseBrands, priceRange, initialResult] = await Promise.all([
    getBrands({ type: 'manufacturer' }),
    getBrands({ type: 'franchise' }),
    getPriceRange(),
    searchProducts(
      {
        page: filters.currentPage,
        limit: 12,
        category: filters.category,
        subcategory: filters.subcategory,
        manufacturerBrand: filters.manufacturerBrand,
        franchiseBrand: filters.franchiseBrand,
        brand: filters.brand,
        condition: filters.condition,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sortBy: filters.sortBy,
        q: filters.search
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
