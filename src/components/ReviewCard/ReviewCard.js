import Image from 'next/image';
import Icon from '../Icon/Icon';
import styles from './ReviewCard.module.css';

const GRADIENT_VARIANTS = 4;

function formatReviewDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function ReviewCard({ review, gradientIndex = 0 }) {
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
            draggable={false}
          />
        </div>
      )}

      <p className={styles.text}>{review.comment || ''}</p>

      <div className={styles.author}>
        <span className={styles.avatar}>{initial}</span>
        <div className={styles.authorMeta}>
          <strong className={styles.authorName}>{name}</strong>
          {subtitle && <span className={styles.authorSubtitle}>{subtitle}</span>}
        </div>
      </div>
    </article>
  );
}
