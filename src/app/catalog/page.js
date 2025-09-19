'use client';

import { Suspense, useState } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import FilterModal from '../../components/FilterModal/FilterModal';
import SortOptions from '../../components/SortOptions/SortOptions';
import SearchBar from '../../components/SearchBar/SearchBar';
import Icon from '../../components/Icon/Icon';
import styles from './catalog.module.css';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// Client Component para obtener datos iniciales
function CatalogData() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  
  const currentPage = parseInt(searchParams.get('page')) || 1;
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const search = searchParams.get('search') || '';

  // Cargar datos iniciales desde API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch('/api/filters');
        
        if (!response.ok) {
          throw new Error('Failed to fetch filter data');
        }
        
        const data = await response.json();
        setCategories(data.categories || []);
        setBrands(data.brands || []);
        setPriceRange(data.priceRange || { min: 0, max: 1000 });
      } catch (error) {
        console.error('Error loading filter data:', error);
        // Usar datos mock como fallback
        setCategories([
          { id: 1, name: 'Belleza', slug: 'belleza' },
          { id: 2, name: 'Manicure', slug: 'manicure' },
          { id: 3, name: 'Cuidado de la Piel', slug: 'cuidado-piel' }
        ]);
        setBrands([
          { id: 1, name: 'Brand A', slug: 'brand-a' },
          { id: 2, name: 'Brand B', slug: 'brand-b' },
          { id: 3, name: 'Brand C', slug: 'brand-c' }
        ]);
        setPriceRange({ min: 0, max: 2000 });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const openFilterModal = () => setIsFilterModalOpen(true);
  const closeFilterModal = () => setIsFilterModalOpen(false);

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.catalogMain}>
          <div className={styles.container}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Cargando filtros...
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.catalogMain}>
        <div className={styles.container}>
          <div className={styles.catalogContent}>
            <aside className={styles.sidebar}>
              <FilterSidebar 
                categories={categories}
                brands={brands}
                priceRange={priceRange}
                currentCategory={category}
                currentBrand={brand}
                currentMinPrice={minPrice}
                currentMaxPrice={maxPrice}
              />
            </aside>
            
            <div className={styles.mainContent}>
                <SearchBar />
              
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
                search={search}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      <FilterModal
        categories={categories}
        brands={brands}
        priceRange={priceRange}
        currentCategory={category}
        currentBrand={brand}
        currentMinPrice={minPrice}
        currentMaxPrice={maxPrice}
        isOpen={isFilterModalOpen}
        onClose={closeFilterModal}
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
      <CatalogData />
    </Suspense>
  );
} 