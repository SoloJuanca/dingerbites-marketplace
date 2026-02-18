'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import styles from './HomeReviews.module.css';

const FALLBACK_REVIEWS = [
  { id: '1', author_name: 'Carlos Méndez', rating: 5, comment: 'Excelente tienda de anime y coleccionables. Las figuras llegaron bien empacadas y el mystery box trajo cosas muy buenas.', location: 'Ciudad de México', image_url: null },
  { id: '2', author_name: 'Laura Sánchez', rating: 5, comment: 'Encontré gachapons y figuras que no veo en ningún otro lado. Muy buena selección de anime y videojuegos.', location: 'Guadalajara', image_url: null },
  { id: '3', author_name: 'Roberto Díaz', rating: 5, comment: 'Calidad y variedad excelente. El equipo conoce el catálogo y te ayuda a encontrar lo que buscas. Envíos rápidos.', location: 'Monterrey', image_url: null }
];

export default function HomeReviews() {
  const [reviews, setReviews] = useState(FALLBACK_REVIEWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reviews/general?limit=12')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayReviews = reviews.length > 0 ? reviews : FALLBACK_REVIEWS;

  return (
    <section id="reviews" className={styles.reviews}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Lo que dicen nuestros clientes</h2>
        {loading ? (
          <p className={styles.loadingText}>Cargando reseñas...</p>
        ) : (
          <div className={styles.reviewsGrid}>
            {displayReviews.map((review) => (
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
        )}
      </div>
    </section>
  );
}
