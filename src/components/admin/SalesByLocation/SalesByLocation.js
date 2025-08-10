'use client';

import styles from './SalesByLocation.module.css';

export default function SalesByLocation({ locations }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-MX').format(number || 0);
  };

  const totalRevenue = Array.isArray(locations) ? locations.reduce((sum, loc) => sum + (loc.total_revenue || 0), 0) : 0;

  if (!Array.isArray(locations) || locations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Ventas por Ubicación</h3>
          <p className={styles.subtitle}>Últimos 30 días</p>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🗺️</div>
          <p className={styles.emptyText}>No hay datos de ubicación disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Ventas por Ubicación</h3>
        <p className={styles.subtitle}>Últimos 30 días</p>
      </div>

      <div className={styles.totalRevenue}>
        <span className={styles.totalLabel}>Total Ingresos</span>
        <span className={styles.totalValue}>{formatCurrency(totalRevenue)}</span>
      </div>

      <div className={styles.locationsList}>
        {locations.slice(0, 8).map((location, index) => {
          const percentage = totalRevenue > 0 ? (location.total_revenue / totalRevenue) * 100 : 0;
          
          return (
            <div key={index} className={styles.locationItem}>
              <div className={styles.locationInfo}>
                <div className={styles.locationName}>
                  {location.city}
                  {location.state && location.state !== 'Sin especificar' && (
                    <span className={styles.locationState}>, {location.state}</span>
                  )}
                </div>
                <div className={styles.locationStats}>
                  <span className={styles.orderCount}>
                    {formatNumber(location.order_count)} pedidos
                  </span>
                  <span className={styles.revenue}>
                    {formatCurrency(location.total_revenue)}
                  </span>
                </div>
              </div>
              
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${Math.max(percentage, 5)}%` }}
                />
              </div>
              
              <div className={styles.percentage}>
                {percentage.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {locations.length > 8 && (
        <div className={styles.footer}>
          <p className={styles.moreLocations}>
            +{locations.length - 8} ubicaciones más
          </p>
        </div>
      )}
    </div>
  );
}
