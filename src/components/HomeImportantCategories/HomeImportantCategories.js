'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './HomeImportantCategories.module.css';

export default function HomeImportantCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetch('/api/home?section=important')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('error'))))
      .then((data) => {
        if (!isMounted) return;
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar las categorías importantes.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className={styles.section} aria-labelledby="important-categories-title">
      <div className="container">
        <header className={styles.header}>
          <h2 id="important-categories-title" className={styles.title}>Categorías importantes</h2>
          <p className={styles.subtitle}>Figuras, gashapon, blind-box y TCG.</p>
        </header>

        {loading ? (
          <div className={styles.stateBox}>Cargando categorías importantes...</div>
        ) : error ? (
          <div className={styles.stateBox}>{error}</div>
        ) : categories.length === 0 ? (
          <div className={styles.stateBox}>No hay categorías importantes configuradas.</div>
        ) : (
          <div className={styles.grid}>
            {categories.map((category) => (
              <article key={category.id || category.slug} className={styles.card}>
                <Link href={`/catalog?category=${encodeURIComponent(category.slug)}`} className={styles.cardLink}>
                  <div className={styles.imageWrap}>
                    <Image
                      src={category.image_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=640&h=360&fit=crop'}
                      alt={category.name || 'Categoría importante'}
                      width={640}
                      height={360}
                      className={styles.image}
                      unoptimized
                    />
                  </div>
                  <h3 className={styles.cardTitle}>{category.name}</h3>
                </Link>

                <ul className={styles.productsList}>
                  {(category.products || []).slice(0, 4).map((product) => (
                    <li key={product.id}>
                      <Link href={`/catalog/${product.slug}`} className={styles.productLink}>
                        {product.name}
                      </Link>
                    </li>
                  ))}
                  {(category.products || []).length === 0 && (
                    <li className={styles.emptyProduct}>Sin productos con stock.</li>
                  )}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
