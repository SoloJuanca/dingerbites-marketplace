'use client';

import { useState, useEffect } from 'react';
import Icon from '../Icon/Icon';
import { getProductReviews } from '../../lib/reviews';
import styles from './ProductReviews.module.css';

export default function ProductReviews({ productId }) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const reviews = getProductReviews(productId);
  
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
      : 0
  }));

  const renderStars = (rating, size = 16) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Icon
        key={index}
        name="star"
        size={size}
        className={`${styles.star} ${index < rating ? styles.filled : styles.empty}`}
      />
    ));
  };

  const formatDate = (dateString) => {
    if (!isClient) return new Date(dateString).toLocaleDateString();
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (reviews.length === 0) {
    return (
      <div className={styles.reviewsContainer}>
        <h3 className={styles.sectionTitle}>Reseñas de clientes</h3>
        <div className={styles.noReviews}>
          <Icon name="rate_review" size={48} className={styles.noReviewsIcon} />
          <p>Aún no hay reseñas para este producto.</p>
          <p className={styles.noReviewsSubtext}>¡Sé el primero en compartir tu opinión!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reviewsContainer}>
      <h3 className={styles.sectionTitle}>Reseñas de clientes</h3>
      
      {/* Rating Summary */}
      <div className={styles.ratingSummary}>
        <div className={styles.overallRating}>
          <div className={styles.ratingValue}>
            {averageRating.toFixed(1)}
          </div>
          <div className={styles.ratingStars}>
            {renderStars(Math.round(averageRating), 20)}
          </div>
          <div className={styles.ratingCount}>
            Basado en {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className={styles.ratingDistribution}>
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className={styles.ratingRow}>
              <span className={styles.ratingLabel}>{rating}</span>
              <Icon name="star" size={14} className={styles.ratingRowIcon} />
              <div className={styles.ratingBar}>
                <div 
                  className={styles.ratingBarFill}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={styles.ratingRowCount}>({count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className={styles.reviewsList}>
        {displayedReviews.map((review) => (
          <div key={review.id} className={styles.reviewItem}>
            <div className={styles.reviewHeader}>
              <div className={styles.reviewerInfo}>
                <div className={styles.reviewerAvatar}>
                  {review.author.charAt(0).toUpperCase()}
                </div>
                <div className={styles.reviewerDetails}>
                  <h4 className={styles.reviewerName}>{review.author}</h4>
                  <div className={styles.reviewMeta}>
                    {renderStars(review.rating, 14)}
                    <span className={styles.reviewDate}>
                      {formatDate(review.date)}
                    </span>
                  </div>
                </div>
              </div>
              {review.verified && (
                <div className={styles.verifiedBadge}>
                  <Icon name="verified" size={16} />
                  <span>Compra verificada</span>
                </div>
              )}
            </div>
            
            <div className={styles.reviewContent}>
              <h5 className={styles.reviewTitle}>{review.title}</h5>
              <p className={styles.reviewComment}>{review.comment}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {reviews.length > 3 && (
        <div className={styles.showMoreContainer}>
          <button
            className={styles.showMoreBtn}
            onClick={() => setShowAllReviews(!showAllReviews)}
          >
            {showAllReviews ? 'Ver menos reseñas' : `Ver todas las reseñas (${reviews.length})`}
          </button>
        </div>
      )}
    </div>
  );
} 