'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './HomeCategories.module.css';

export default function HomeCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const trackRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/home?section=categories')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('error'))))
      .then((data) => {
        if (!isMounted) return;
        const items = Array.isArray(data.categories) ? data.categories : [];
        setCategories(items.filter((category) => category?.slug).slice(0, 8));
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar las categorías.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleScroll = (direction) => {
    if (!trackRef.current) return;
    const amount = direction === 'next' ? 320 : -320;
    trackRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className={styles.section} aria-labelledby="home-categories-title">
      <div className="container">
        <header className={styles.header}>
          <h2 id="home-categories-title" className={styles.title}>Categorías</h2>
          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={() => handleScroll('prev')}
              className={styles.navButton}
              aria-label="Desplazar categorías hacia la izquierda"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => handleScroll('next')}
              className={styles.navButton}
              aria-label="Desplazar categorías hacia la derecha"
            >
              ›
            </button>
            <Link href="/catalog" className={styles.link}>Ver catálogo completo</Link>
          </div>
        </header>

        {loading ? (
          <div className={styles.stateBox}>Cargando categorías...</div>
        ) : error ? (
          <div className={styles.stateBox}>{error}</div>
        ) : categories.length === 0 ? (
          <div className={styles.stateBox}>No hay categorías disponibles.</div>
        ) : (
          <div className={styles.carouselTrack} ref={trackRef}>
            {categories.map((category) => (
              <Link
                href={`/catalog?category=${encodeURIComponent(category.slug)}`}
                key={category.id || category.slug}
                className={styles.card}
              >
                <div className={styles.imageWrap}>
                  <Image
                    src={category.image_url || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=280&fit=crop'}
                    alt={category.name || 'Categoría'}
                    width={400}
                    height={280}
                    className={styles.image}
                    unoptimized
                  />
                </div>
                <h3 className={styles.cardTitle}>{category.name}</h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
