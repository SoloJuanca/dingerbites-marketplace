'use client';

import styles from './DashboardStats.module.css';

export default function DashboardStats({ stats }) {
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

  const statCards = [
    {
      title: 'Ventas Hoy',
      value: formatCurrency(stats?.revenue_today),
      subtitle: `${formatNumber(stats?.orders_today)} pedidos`,
      icon: '💰',
      color: 'green',
      trend: '+12%'
    },
    {
      title: 'Ventas Esta Semana',
      value: formatCurrency(stats?.revenue_week),
      subtitle: `${formatNumber(stats?.orders_week)} pedidos`,
      icon: '📈',
      color: 'blue',
      trend: '+8%'
    },
    {
      title: 'Ventas Este Mes',
      value: formatCurrency(stats?.revenue_month),
      subtitle: `${formatNumber(stats?.orders_month)} pedidos`,
      icon: '📊',
      color: 'purple',
      trend: '+15%'
    },
    {
      title: 'Nuevos Usuarios',
      value: formatNumber(stats?.new_users_month),
      subtitle: `${formatNumber(stats?.new_users_week)} esta semana`,
      icon: '👥',
      color: 'orange',
      trend: '+5%'
    },
    {
      title: 'Stock Bajo',
      value: formatNumber(stats?.low_stock_products),
      subtitle: 'Productos con stock bajo',
      icon: '⚠️',
      color: 'yellow',
      alert: true
    },
    {
      title: 'Sin Stock',
      value: formatNumber(stats?.out_of_stock_products),
      subtitle: 'Productos agotados',
      icon: '🚫',
      color: 'red',
      alert: true
    }
  ];

  return (
    <div className={styles.statsGrid}>
      {statCards.map((card, index) => (
        <div 
          key={index} 
          className={`${styles.statCard} ${styles[card.color]} ${card.alert ? styles.alert : ''}`}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>{card.icon}</div>
            <div className={styles.cardTitle}>{card.title}</div>
          </div>
          
          <div className={styles.cardContent}>
            <div className={styles.cardValue}>{card.value}</div>
            <div className={styles.cardSubtitle}>{card.subtitle}</div>
          </div>
          
          {card.trend && !card.alert && (
            <div className={styles.cardTrend}>
              <span className={styles.trendValue}>{card.trend}</span>
              <span className={styles.trendLabel}>vs mes anterior</span>
            </div>
          )}
          
          {card.alert && (
            <div className={styles.cardAlert}>
              <span className={styles.alertText}>Requiere atención</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
