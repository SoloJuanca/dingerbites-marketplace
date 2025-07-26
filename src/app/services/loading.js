import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <>
      <Header />
      <main className={styles.loadingMain}>
        <div className={styles.container}>
          <div className={styles.loadingHeader}>
            <div className={styles.titleSkeleton}></div>
            <div className={styles.subtitleSkeleton}></div>
          </div>
          
          <div className={styles.loadingContent}>
            <aside className={styles.sidebarSkeleton}>
              <div className={styles.filterSkeleton}></div>
              <div className={styles.filterSkeleton}></div>
              <div className={styles.filterSkeleton}></div>
            </aside>
            
            <div className={styles.mainContentSkeleton}>
              <div className={styles.gridSkeleton}>
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className={styles.cardSkeleton}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 