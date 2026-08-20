import { redirect, notFound } from 'next/navigation';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import CatalogProductPage from '../../../components/CatalogProductPage/CatalogProductPage';
import { getCategories, getProductBySlug } from '../../../lib/firebaseProducts';
import { getTcgMarketPriceForProduct } from '../../../lib/tcgMarketPrice';
import { getCategoryCatalogHref } from '../../../lib/catalogFilters';

export const dynamic = 'force-dynamic';

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
  const canonical = getCategoryCatalogHref(category.slug);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { title, description }
  };
}

function buildCategoryRedirectUrl(slug, searchParams = {}) {
  const params = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (key === 'category' || key === 'mode' || key === 'page') return;
    if (value != null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });

  if (slug === 'tcg') {
    params.set('mode', 'tcg');
  } else {
    params.set('category', slug);
  }

  params.set('inStockOnly', params.get('inStockOnly') || 'true');
  const query = params.toString();
  return query ? `/catalog?${query}` : '/catalog';
}

export default async function CatalogSlugPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;

  const product = await getProductBySlug(slug);
  if (product) {
    let initialMarketPriceMxn = null;
    let initialMarketPriceError = null;

    if (product.tcg_product_id) {
      try {
        const tcgPrice = await getTcgMarketPriceForProduct(product);
        initialMarketPriceMxn = tcgPrice.marketPriceMxn;
      } catch (err) {
        initialMarketPriceError =
          err?.message || 'No pudimos obtener el precio actualizado desde TCG.';
      }
    }

    return (
      <CatalogProductPage
        slug={slug}
        initialMarketPriceMxn={initialMarketPriceMxn}
        initialMarketPriceError={initialMarketPriceError}
      />
    );
  }

  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug && !item.parent_id);
  if (!category) {
    notFound();
  }

  redirect(buildCategoryRedirectUrl(slug, resolvedSearch));
}
