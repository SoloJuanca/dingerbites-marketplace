'use client';

import styles from './RevenueChart.module.css';

export default function RevenueChart({ data, monthlyData }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate totals for the last 30 days
  const totalRevenue = Array.isArray(data) ? data.reduce((sum, item) => sum + (item.revenue || 0), 0) : 0;
  const totalOrders = Array.isArray(data) ? data.reduce((sum, item) => sum + (item.orders || 0), 0) : 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Ingresos y Ventas</h3>
        <p className={styles.subtitle}>Últimos 30 días</p>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ingresos Totales</span>
          <span className={styles.summaryValue}>{formatCurrency(totalRevenue)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Pedidos</span>
          <span className={styles.summaryValue}>{totalOrders}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Valor Promedio</span>
          <span className={styles.summaryValue}>{formatCurrency(averageOrderValue)}</span>
        </div>
      </div>

      <div className={styles.chartPlaceholder}>
        <div className={styles.chartIcon}>📈</div>
        <p className={styles.chartText}>Gráfico de ingresos</p>
        <p className={styles.chartSubtext}>
          {Array.isArray(data) && data.length > 0 
            ? `${data.length} días de datos disponibles`
            : 'No hay datos disponibles'
          }
        </p>
      </div>

      {Array.isArray(data) && data.length > 0 && (
        <div className={styles.dataTable}>
          <h4 className={styles.tableTitle}>Datos Recientes</h4>
          <div className={styles.tableContainer}>
            {data.slice(-7).reverse().map((item, index) => (
              <div key={index} className={styles.tableRow}>
                <span className={styles.tableDate}>
                  {new Date(item.date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
                <span className={styles.tableOrders}>{item.orders} pedidos</span>
                <span className={styles.tableRevenue}>{formatCurrency(item.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
