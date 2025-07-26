import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ServiceGrid from '../../components/ServiceGrid/ServiceGrid';
import ServiceFilters from '../../components/ServiceFilters/ServiceFilters';
import styles from './services.module.css';

export default function ServicesPage({ searchParams }) {
  const category = searchParams?.category || '';
  const level = searchParams?.level || '';
  const minPrice = searchParams?.minPrice || '';
  const maxPrice = searchParams?.maxPrice || '';

  return (
    <>
      <Header />
      <main className={styles.servicesMain}>
        <div className={styles.container}>
          <div className={styles.servicesHeader}>
            <h1 className={styles.title}>Nuestros Servicios</h1>
            <p className={styles.subtitle}>
              Cursos profesionales de belleza y manicure con certificación. 
              Aprende de los mejores y convierte tu pasión en profesión.
            </p>
          </div>
          
          <div className={styles.servicesContent}>
            <aside className={styles.sidebar}>
              <ServiceFilters 
                currentCategory={category}
                currentLevel={level}
                currentMinPrice={minPrice}
                currentMaxPrice={maxPrice}
              />
            </aside>
            
            <div className={styles.mainContent}>
              <ServiceGrid 
                category={category}
                level={level}
                minPrice={minPrice}
                maxPrice={maxPrice}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 