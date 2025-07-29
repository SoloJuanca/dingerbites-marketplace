'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ServiceGrid from '../../components/ServiceGrid/ServiceGrid';
import ServiceFilters from '../../components/ServiceFilters/ServiceFilters';
import ServiceFiltersModal from '../../components/ServiceFiltersModal/ServiceFiltersModal';
import Icon from '../../components/Icon/Icon';
import styles from './services.module.css';

function ServicesContent() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const searchParams = useSearchParams();
  
  const category = searchParams.get('category') || '';
  const level = searchParams.get('level') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const openFilterModal = () => setIsFilterModalOpen(true);
  const closeFilterModal = () => setIsFilterModalOpen(false);

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
              <div className={styles.sortSection}>
                <button 
                  className={styles.filterButton}
                  onClick={openFilterModal}
                >
                  <Icon name="tune" size={20} />
                  Filtros
                </button>
              </div>
              
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
      
      <ServiceFiltersModal
        isOpen={isFilterModalOpen}
        onClose={closeFilterModal}
        currentCategory={category}
        currentLevel={level}
        currentMinPrice={minPrice}
        currentMaxPrice={maxPrice}
      />
    </>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div>
        <Header />
        <main className={styles.servicesMain}>
          <div className={styles.container}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Cargando...
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <ServicesContent />
    </Suspense>
  );
} 