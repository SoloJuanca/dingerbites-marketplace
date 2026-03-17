'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './HomeCategories.module.css';

export default function HomeCategories({ categories = [] }) {
  const trackRef = useRef(null);
  const filteredCategories = (Array.isArray(categories) ? categories : [])
    .filter((category) => category?.slug)
    .slice(0, 8);

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
        </header>

        {filteredCategories.length === 0 ? (
          <div className={styles.stateBox}>No hay categorías disponibles.</div>
        ) : (
          <div className={styles.carouselTrack} ref={trackRef}>
            {filteredCategories.map((category) => (
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
