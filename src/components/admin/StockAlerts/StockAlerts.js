'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './StockAlerts.module.css';

export default function StockAlerts({ alerts }) {
  const [showAll, setShowAll] = useState(false);
  
  const displayAlerts = showAll ? (Array.isArray(alerts) ? alerts : []) : (Array.isArray(alerts) ? alerts.slice(0, 5) : []);

  const getAlertColor = (alertType) => {
    switch (alertType) {
      case 'out_of_stock':
        return '#ef4444';
      case 'low_stock':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const getAlertText = (alertType) => {
    switch (alertType) {
      case 'out_of_stock':
        return 'Sin Stock';
      case 'low_stock':
        return 'Stock Bajo';
      default:
        return 'Alerta';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price || 0);
  };

  if (!Array.isArray(alerts) || alerts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Alertas de Stock</h3>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <p className={styles.emptyText}>No hay alertas de stock pendientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Alertas de Stock</h3>
        <span className={styles.alertCount}>{alerts.length}</span>
      </div>

      <div className={styles.alertsList}>
        {displayAlerts.map((alert) => (
          <div key={alert.id} className={styles.alertItem}>
            <div className={styles.productInfo}>
              <div className={styles.imageContainer}>
                {alert.image_url ? (
                  <Image
                    src={alert.image_url}
                    alt={alert.product_name}
                    width={48}
                    height={48}
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
                  {alert.product_name}
                </h4>
                <p className={styles.productSku}>
                  SKU: {alert.sku || 'N/A'}
                </p>
                <p className={styles.productPrice}>
                  {formatPrice(alert.price)}
                </p>
              </div>
            </div>

            <div className={styles.alertDetails}>
              <div 
                className={styles.alertBadge}
                style={{ backgroundColor: getAlertColor(alert.alert_type) }}
              >
                {getAlertText(alert.alert_type)}
              </div>
              
              <div className={styles.stockInfo}>
                <span className={styles.stockCurrent}>
                  Stock: {alert.current_stock}
                </span>
                {alert.threshold_value && (
                  <span className={styles.stockThreshold}>
                    Min: {alert.threshold_value}
                  </span>
                )}
              </div>
              
              <p className={styles.alertDate}>
                {new Date(alert.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className={styles.alertActions}>
              <Link 
                href={`/admin/products/${alert.product_id}/edit`}
                className={styles.actionButton}
              >
                Editar
              </Link>
            </div>
          </div>
        ))}
      </div>

      {Array.isArray(alerts) && alerts.length > 5 && (
        <div className={styles.footer}>
          <button 
            onClick={() => setShowAll(!showAll)}
            className={styles.showMoreButton}
          >
            {showAll ? 'Mostrar Menos' : `Ver Todas (${alerts.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
