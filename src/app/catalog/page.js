import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ProductGrid from '../../components/ProductGrid/ProductGrid';
import FilterSidebar from '../../components/FilterSidebar/FilterSidebar';
import SortOptions from '../../components/SortOptions/SortOptions';
import styles from './catalog.module.css';

export default function CatalogPage({ searchParams }) {
  const currentPage = parseInt(searchParams?.page) || 1;
  const category = searchParams?.category || '';
  const brand = searchParams?.brand || '';
  const minPrice = searchParams?.minPrice || '';
  const maxPrice = searchParams?.maxPrice || '';
  const sortBy = searchParams?.sortBy || 'newest';

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
    </>
  );
} 