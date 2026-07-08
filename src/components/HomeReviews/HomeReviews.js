import Image from 'next/image';
import Icon from '../Icon/Icon';
import styles from './HomeReviews.module.css';

const GRADIENT_VARIANTS = 4;

function formatReviewDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function ReviewCard({ review, gradientIndex }) {
  const name = review.author_name || review.name || 'Cliente';
  const initial = name.trim().charAt(0).toUpperCase() || 'C';
  const location = review.location || review.author_location || '';
  const date = formatReviewDate(review.created_at);
  const subtitle = [location, date].filter(Boolean).join(' · ');
  const gradientClass = styles[`grad${gradientIndex % GRADIENT_VARIANTS}`];

  return (
    <article className={`${styles.card} ${gradientClass}`}>
      <div className={styles.cardTop}>
        <div className={styles.stars}>
          {[...Array(5)].map((_, i) => (
            <Icon
              key={i}
              name="star"
              size={16}
              className={styles.star}
              filled={i < (review.rating || 0)}
            />
          ))}
        </div>
      </div>

      {review.image_url && (
        <div className={styles.imageWrap}>
          <Image
            src={review.image_url}
            alt=""
            width={320}
            height={180}
            className={styles.image}
          />
        </div>
      )}

      <p className={styles.text}>{review.comment || ''}</p>

      <div className={styles.author}>
        <span className={styles.avatar}>{initial}</span>
        <div className={styles.authorMeta}>
          <strong className={styles.authorName}>{name}</strong>
          {subtitle && (
            <span className={styles.authorSubtitle}>{subtitle}</span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Group reviews into vertical columns of 2 so stacked cards fill the gaps */
function buildColumns(reviews, perColumn = 2) {
  const columns = [];
  for (let i = 0; i < reviews.length; i += perColumn) {
    columns.push(reviews.slice(i, i + perColumn));
  }
  return columns;
}

export default function HomeReviews({ reviews = [] }) {
  const reviewList = Array.isArray(reviews) ? reviews : [];
  if (reviewList.length === 0) {
    return null;
  }

  const columns = buildColumns(reviewList, 2);
  /** Duplicated columns so the horizontal marquee loops seamlessly */
  const loopedColumns = [...columns, ...columns];
  const animationDuration = Math.max(columns.length * 10, 24);

  return (
    <section id="reviews" className={styles.reviews}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Lo que dicen nuestros clientes</h2>
      </div>
      <div className={styles.marquee}>
        <div
          className={styles.track}
          style={{ '--marquee-duration': `${animationDuration}s` }}
        >
          {loopedColumns.map((column, columnIndex) => (
            <div
              key={`col-${columnIndex}`}
              className={styles.column}
              aria-hidden={columnIndex >= columns.length ? 'true' : undefined}
            >
              {column.map((review, cardIndex) => (
                <ReviewCard
                  key={`${review.id}-${columnIndex}-${cardIndex}`}
                  review={review}
                  gradientIndex={columnIndex + cardIndex}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
