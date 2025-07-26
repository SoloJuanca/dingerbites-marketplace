import { getProducts } from '../../lib/products';
import ProductCard from '../ProductCard/ProductCard';
import Pagination from '../Pagination/Pagination';
import Icon from '../Icon/Icon';
import styles from './ProductGrid.module.css';

export default function ProductGrid({
  currentPage,
  category,
  brand,
  minPrice,
  maxPrice,
  sortBy
}) {
  const filters = {
    category,
    brand,
    minPrice,
    maxPrice,
    sortBy,
    page: currentPage,
    limit: 8
  };

  const { products, total, totalPages, hasNextPage, hasPrevPage } = getProducts(filters);

  if (products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Icon name="search_off" size={64} className={styles.searchIcon} />
        </div>
        <h3 className={styles.emptyTitle}>No se encontraron productos</h3>
        <p className={styles.emptyMessage}>
          Intenta ajustar los filtros para ver más resultados
        </p>
      </div>
    );
  }

  return (
    <div className={styles.gridContainer}>
      <div className={styles.resultsHeader}>
        <p className={styles.resultsCount}>
          Mostrando {products.length} de {total} productos
        </p>
      </div>

      <div className={styles.productGrid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
        />
      )}
    </div>
  );
} 