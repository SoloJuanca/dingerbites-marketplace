import Header from '../components/Header/Header';
import HomeBannerCarousel from '../components/HomeBannerCarousel/HomeBannerCarousel';
import HomeCategories from '../components/HomeCategories/HomeCategories';
import HomeProductSection from '../components/HomeProductSection/HomeProductSection';
import HomeReviews from '../components/HomeReviews/HomeReviews';
import Footer from '../components/Footer/Footer';
import { listHomeBannersPublic } from '../lib/firebaseHomeBanners';
import { getCategories, getNewestProducts, getPopularProducts } from '../lib/firebaseProducts';
import { getGeneralReviews } from '../lib/firebaseReviews';

/** Banners and home sections read from Firestore — avoid static HTML cached until redeploy */
export const revalidate = 0;

export default async function Home() {
  const [bannersResult, categoriesResult, newestResult, popularResult, reviewsResult] = await Promise.allSettled([
    listHomeBannersPublic(),
    getCategories(),
    getNewestProducts({ limit: 8, inStockOnly: true }),
    getPopularProducts({ limit: 8, inStockOnly: true, windowDays: 30 }),
    getGeneralReviews({ limit: 12, approvedOnly: true })
  ]);

  const banners = bannersResult.status === 'fulfilled' ? bannersResult.value : [];
  const categories = categoriesResult.status === 'fulfilled'
    ? (Array.isArray(categoriesResult.value) ? categoriesResult.value : [])
    : [];
  const newestProducts = newestResult.status === 'fulfilled' ? newestResult.value : [];
  const popularProducts = popularResult.status === 'fulfilled' ? popularResult.value : [];
  const reviews = reviewsResult.status === 'fulfilled'
    ? (Array.isArray(reviewsResult.value?.reviews) ? reviewsResult.value.reviews : [])
    : [];

  return (
    <>
      <Header />
      <HomeBannerCarousel banners={banners} />
      <HomeCategories categories={categories} />
      <HomeProductSection
        title="Productos más nuevos"
        subtitle="Las últimas novedades recién agregadas."
        products={newestProducts}
        emptyMessage="No hay productos nuevos disponibles."
      />
      <HomeProductSection
        title="Productos más populares"
        subtitle="Top vendidos de los últimos 30 días con stock disponible."
        products={popularProducts}
        emptyMessage="Aún no hay productos populares disponibles."
      />
      <HomeReviews reviews={reviews} />
      <Footer />
    </>
  );
}
