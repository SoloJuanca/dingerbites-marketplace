import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import styles from './loading.module.css';

export default function CatalogLoading() {
  return (
    <>
      <Header />
      <main className={styles.catalogMain}>
        <div className={styles.container}>
          <div className={styles.catalogContent}>
            {/* Sidebar loading */}
            <aside className={styles.sidebar}>
              <div className={styles.sidebarContent}>
                <div className={styles.sidebarTitleSkeleton}></div>
                
                {/* Categorías loading */}
                <div className={styles.filterSection}>
                  <div className={styles.sectionHeaderSkeleton}></div>
                  <div className={styles.sectionContent}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className={styles.checkboxSkeleton}></div>
                    ))}
                  </div>
                </div>

                {/* Marcas loading */}
                <div className={styles.filterSection}>
                  <div className={styles.sectionHeaderSkeleton}></div>
                  <div className={styles.sectionContent}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={styles.checkboxSkeleton}></div>
                    ))}
                  </div>
                </div>

                {/* Precios loading */}
                <div className={styles.filterSection}>
                  <div className={styles.sectionHeaderSkeleton}></div>
                  <div className={styles.sectionContent}>
                    <div className={styles.priceInputsSkeleton}>
                      <div className={styles.priceInputSkeleton}></div>
                      <div className={styles.priceSeparatorSkeleton}></div>
                      <div className={styles.priceInputSkeleton}></div>
                    </div>
                    <div className={styles.priceButtonSkeleton}></div>
                  </div>
                </div>
              </div>
            </aside>
            
            {/* Main content loading */}
            <div className={styles.mainContent}>
              <div className={styles.sortSection}>
                <div className={styles.filterButtonSkeleton}></div>
                <div className={styles.sortOptionsSkeleton}></div>
              </div>
              
              {/* Product grid loading */}
              <div className={styles.gridContainer}>
                <div className={styles.resultsHeaderSkeleton}></div>
                
                <div className={styles.productGrid}>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={styles.productCardSkeleton}>
                      <div className={styles.imageSkeleton}></div>
                      <div className={styles.contentSkeleton}>
                        <div className={styles.nameSkeleton}></div>
                        <div className={styles.descriptionSkeleton}></div>
                        <div className={styles.footerSkeleton}>
                          <div className={styles.priceSkeleton}></div>
                          <div className={styles.buttonSkeleton}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 