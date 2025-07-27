'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import FilterModal from '../../components/FilterModal/FilterModal';
import SortOptions from '../../components/SortOptions/SortOptions';
import Icon from '../../components/Icon/Icon';
import styles from './catalog.module.css';

function CatalogContent() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const searchParams = useSearchParams();
  
  const currentPage = parseInt(searchParams.get('page')) || 1;
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';

  const openFilterModal = () => setIsFilterModalOpen(true);
  const closeFilterModal = () => setIsFilterModalOpen(false);

  return (
    <>
      <Header />
      <main className={styles.catalogMain}>
        <div className={styles.container}>
          <div className={styles.catalogContent}>
            <aside className={styles.sidebar}>
              <FilterSidebar 
                currentCategory={category}
                currentBrand={brand}
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
                <SortOptions currentSort={sortBy} />
              </div>
              
              <ProductGrid 
                currentPage={currentPage}
                category={category}
                brand={brand}
                minPrice={minPrice}
                maxPrice={maxPrice}
                sortBy={sortBy}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={closeFilterModal}
        currentCategory={category}
        currentBrand={brand}
        currentMinPrice={minPrice}
        currentMaxPrice={maxPrice}
      />
    </>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div>
        <Header />
        <main className={styles.catalogMain}>
          <div className={styles.container}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Cargando...
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <CatalogContent />
    </Suspense>
  );
} 