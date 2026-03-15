import Image from 'next/image';
import Icon from '../Icon/Icon';
import styles from './HomeReviews.module.css';

export default function HomeReviews({ reviews = [] }) {
  const reviewList = Array.isArray(reviews) ? reviews : [];
  if (reviewList.length === 0) {
    return null;
  }

  return (
    <section id="reviews" className={styles.reviews}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Lo que dicen nuestros clientes</h2>
        <div className={styles.reviewsGrid}>
          {reviewList.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              {review.image_url && (
                <div className={styles.reviewImageWrap}>
                  <Image
                    src={review.image_url}
                    alt=""
                    width={320}
                    height={200}
                    className={styles.reviewImage}
                    unoptimized
                  />
                </div>
              )}
              <div className={styles.reviewHeader}>
                <div className={styles.reviewStars}>
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      size={16}
                      className={styles.starIcon}
                      filled={i < (review.rating || 0)}
                    />
                  ))}
                </div>
              </div>
              <p className={styles.reviewText}>{'"' + (review.comment || '') + '"'}</p>
              <div className={styles.reviewAuthor}>
                <strong className={styles.authorName}>{review.author_name || review.name}</strong>
                {(review.location || review.author_location) && (
                  <span className={styles.authorLocation}>{review.location || review.author_location}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
