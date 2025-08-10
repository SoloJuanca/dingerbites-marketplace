'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './TopProducts.module.css';

export default function TopProducts({ products }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-MX').format(number || 0);
  };

  if (!Array.isArray(products) || products.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Top 10 Productos</h3>
          <p className={styles.subtitle}>Últimos 30 días</p>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <p className={styles.emptyText}>No hay datos de ventas disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Top 10 Productos</h3>
        <p className={styles.subtitle}>Últimos 30 días</p>
      </div>

      <div className={styles.productsList}>
        {products.slice(0, 10).map((product, index) => (
          <div key={product.id} className={styles.productItem}>
            <div className={styles.rank}>
              <span className={styles.rankNumber}>#{index + 1}</span>
            </div>

            <div className={styles.productInfo}>
              <div className={styles.imageContainer}>
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    width={40}
                    height={40}
                    className={styles.productImage}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    📦
                  </div>
                )}
              </div>
              
              <div className={styles.productDetails}>
                <h4 className={styles.productName}>
                  {product.name}
                </h4>
                <div className={styles.productMeta}>
                  <span className={styles.productCategory}>
                    {product.category_name || 'Sin categoría'}
                  </span>
                  {product.brand_name && (
                    <span className={styles.productBrand}>
                      • {product.brand_name}
                    </span>
                  )}
                </div>
                <div className={styles.productPrice}>
                  {formatCurrency(product.price)}
                </div>
              </div>
            </div>

            <div className={styles.salesInfo}>
              <div className={styles.salesData}>
                <div className={styles.salesItem}>
                  <span className={styles.salesLabel}>Vendidos</span>
                  <span className={styles.salesValue}>
                    {formatNumber(product.total_sold)}
                  </span>
                </div>
                <div className={styles.salesItem}>
                  <span className={styles.salesLabel}>Ingresos</span>
                  <span className={styles.salesValue}>
                    {formatCurrency(product.total_revenue)}
                  </span>
                </div>
                <div className={styles.salesItem}>
                  <span className={styles.salesLabel}>Stock</span>
                  <span className={`${styles.salesValue} ${
                    product.stock_quantity <= 5 ? styles.lowStock : ''
                  }`}>
                    {formatNumber(product.stock_quantity)}
                  </span>
                </div>
              </div>
              
              <div className={styles.actions}>
                <Link 
                  href={`/admin/products/${product.id}/edit`}
                  className={styles.editButton}
                >
                  Editar
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Link href="/admin/products" className={styles.viewAllButton}>
          Ver Todos los Productos
        </Link>
      </div>
    </div>
  );
}
