import { Suspense } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import FilterModal from '../../components/FilterModal/FilterModal';
import SortOptions from '../../components/SortOptions/SortOptions';
import Icon from '../../components/Icon/Icon';
import styles from './catalog.module.css';
import { getCategories, getBrands, getPriceRange } from '../../lib/products';

// Server Component para obtener datos iniciales
async function CatalogData({ searchParams }) {
  const currentPage = parseInt(searchParams?.page) || 1;
  const category = searchParams?.category || '';
  const brand = searchParams?.brand || '';
  const minPrice = searchParams?.minPrice || '';
  const maxPrice = searchParams?.maxPrice || '';
  const sortBy = searchParams?.sortBy || 'newest';

  // Obtener datos desde la base de datos
  const [categories, brands, priceRange] = await Promise.all([
    getCategories(),
    getBrands(),
    getPriceRange()
  ]);

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
              <div className={styles.sortSection}>
                <button 
                  className={styles.filterButton}
                  id="filterButton"
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
        categories={categories}
        brands={brands}
        priceRange={priceRange}
        currentCategory={category}
        currentBrand={brand}
        currentMinPrice={minPrice}
        currentMaxPrice={maxPrice}
      />
    </>
  );
}

export default function CatalogPage({ searchParams }) {
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
      <CatalogData searchParams={searchParams} />
    </Suspense>
  );
} 