import Link from 'next/link';
import ProductCard from '../ProductCard/ProductCard';
import styles from './HomeProductSection.module.css';

export default function HomeProductSection({
  title,
  subtitle,
  products = [],
  emptyMessage = 'No hay productos disponibles en este momento.'
}) {
  const productList = Array.isArray(products) ? products : [];

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

        {productList.length === 0 ? (
          <div className={styles.stateBox}>{emptyMessage}</div>
        ) : (
          <div className={styles.grid}>
            {productList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
