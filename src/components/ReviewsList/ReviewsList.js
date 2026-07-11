'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReviewCard from '../ReviewCard/ReviewCard';
import styles from './ReviewsList.module.css';

export default function ReviewsList({
  initialReviews = [],
  initialHasNextPage = false,
  pageSize = 12
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasNextPage) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError('');

    const nextPage = page + 1;
    try {
      const res = await fetch(
        `/api/reviews/general?page=${nextPage}&limit=${pageSize}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('No se pudieron cargar más reseñas');
      const data = await res.json();
      const newReviews = Array.isArray(data?.reviews) ? data.reviews : [];

      setReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        newReviews.forEach((r) => {
          if (!seen.has(r.id)) merged.push(r);
        });
        return merged;
      });
      setPage(nextPage);
      setHasNextPage(Boolean(data?.pagination?.hasNextPage));
    } catch (err) {
      setError(err.message || 'Ocurrió un error al cargar reseñas');
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasNextPage, page, pageSize]);

  /** Auto-load the next page when the sentinel scrolls into view */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, loadMore]);

  if (reviews.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Aún no hay reseñas publicadas. ¡Sé el primero en compartir tu experiencia!</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.grid}>
        {reviews.map((review, index) => (
          <div key={review.id} className={styles.gridItem}>
            <ReviewCard review={review} gradientIndex={index} />
          </div>
        ))}
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={loadMore}>
            Reintentar
          </button>
        </div>
      )}

      {hasNextPage && (
        <div className={styles.loadMoreWrap} ref={sentinelRef}>
          <button
            type="button"
            className={styles.loadMoreButton}
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Cargando…' : 'Cargar más reseñas'}
          </button>
        </div>
      )}
    </div>
  );
}
