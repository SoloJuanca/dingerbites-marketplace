'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '../ProductCard/ProductCard';
import styles from './HomeProductSection.module.css';

export default function HomeProductSection({
  title,
  subtitle,
  section = 'newest',
  emptyMessage = 'No hay productos disponibles en este momento.'
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');

    fetch(`/api/home?section=${encodeURIComponent(section)}&limit=8`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('error'))))
      .then((data) => {
        if (!isMounted) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudieron cargar los productos.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [section]);

  return (
    <section className={styles.section}>
      <div className="container">
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <Link href="/catalog" className={styles.link}>Ver todo</Link>
        </header>

        {loading ? (
          <div className={styles.stateBox}>Cargando productos...</div>
        ) : error ? (
          <div className={styles.stateBox}>{error}</div>
        ) : products.length === 0 ? (
          <div className={styles.stateBox}>{emptyMessage}</div>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
