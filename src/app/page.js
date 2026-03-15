import Header from '../components/Header/Header';
import HomeBannerCarousel from '../components/HomeBannerCarousel/HomeBannerCarousel';
import HomeCategories from '../components/HomeCategories/HomeCategories';
import HomeProductSection from '../components/HomeProductSection/HomeProductSection';
import HomeReviews from '../components/HomeReviews/HomeReviews';
import Footer from '../components/Footer/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <HomeBannerCarousel />
      <HomeCategories />
      <HomeProductSection
        title="Productos más nuevos"
        subtitle="Las últimas novedades recién agregadas."
        section="newest"
        emptyMessage="No hay productos nuevos disponibles."
      />
      <HomeProductSection
        title="Productos más populares"
        subtitle="Top vendidos de los últimos 30 días con stock disponible."
        section="popular"
        emptyMessage="Aún no hay productos populares disponibles."
      />
      <HomeReviews />
      <Footer />
    </>
  );
}
