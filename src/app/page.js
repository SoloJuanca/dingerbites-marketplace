import Header from '../components/Header/Header';
import Hero from '../components/Hero/Hero';
import FreshProducts from '../components/FreshProducts/FreshProducts';
import HowItWorks from '../components/HowItWorks/HowItWorks';
import BrowseMenu from '../components/BrowseMenu/BrowseMenu';
import MobileApp from '../components/MobileApp/MobileApp';
import HomeReviews from '../components/HomeReviews/HomeReviews';
import ContactInfo from '../components/ContactInfo/ContactInfo';
import Footer from '../components/Footer/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <FreshProducts />
      <HowItWorks />
      <BrowseMenu />
      <MobileApp />
      <HomeReviews />
      <ContactInfo />
      <Footer />
    </>
  );
}
