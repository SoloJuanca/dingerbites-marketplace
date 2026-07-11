import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import ReviewsList from '../../components/ReviewsList/ReviewsList';
import { getGeneralReviews } from '../../lib/firebaseReviews';
import styles from './reviews.module.css';

export const revalidate = 0;

export const metadata = {
  title: 'Reseñas de clientes | Dinger Bites',
  description: 'Descubre lo que opinan nuestros clientes sobre sus compras.'
};

const PAGE_SIZE = 12;

export default async function ReviewsPage() {
  let initialReviews = [];
  let pagination = { total: 0, totalPages: 0, currentPage: 1, hasNextPage: false };

  try {
    const result = await getGeneralReviews({ page: 1, limit: PAGE_SIZE, approvedOnly: true });
    initialReviews = Array.isArray(result?.reviews) ? result.reviews : [];
    pagination = result?.pagination || pagination;
  } catch (error) {
    console.error('Error loading reviews page:', error);
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.container}>
            <h1 className={styles.title}>Lo que dicen nuestros clientes</h1>
            <p className={styles.subtitle}>
              {pagination.total > 0
                ? `${pagination.total} reseñas de compradores reales.`
                : 'Aún no hay reseñas publicadas.'}
            </p>
          </div>
        </section>

        <section className={styles.listSection}>
          <div className={styles.container}>
            <ReviewsList
              initialReviews={initialReviews}
              initialHasNextPage={pagination.hasNextPage}
              pageSize={PAGE_SIZE}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
