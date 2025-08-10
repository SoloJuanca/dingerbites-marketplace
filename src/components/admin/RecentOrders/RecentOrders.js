'use client';

import Link from 'next/link';
import styles from './RecentOrders.module.css';

export default function RecentOrders({ orders }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (statusColor) => {
    return statusColor || '#64748b';
  };

  if (!Array.isArray(orders) || orders.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Pedidos Recientes</h3>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📦</div>
          <p className={styles.emptyText}>No hay pedidos recientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Pedidos Recientes</h3>
        <Link href="/admin/orders" className={styles.viewAllLink}>
          Ver Todos
        </Link>
      </div>

      <div className={styles.ordersTable}>
        <div className={styles.tableHeader}>
          <div className={styles.headerCell}>Pedido</div>
          <div className={styles.headerCell}>Cliente</div>
          <div className={styles.headerCell}>Estado</div>
          <div className={styles.headerCell}>Items</div>
          <div className={styles.headerCell}>Total</div>
          <div className={styles.headerCell}>Fecha</div>
          <div className={styles.headerCell}>Acciones</div>
        </div>

        <div className={styles.tableBody}>
          {orders.slice(0, 10).map((order) => (
            <div key={order.id} className={styles.tableRow}>
              <div className={styles.tableCell}>
                <div className={styles.orderNumber}>
                  #{order.order_number}
                </div>
              </div>
              
              <div className={styles.tableCell}>
                <div className={styles.customerInfo}>
                  <div className={styles.customerName}>
                    {order.customer_name}
                  </div>
                  <div className={styles.customerEmail}>
                    {order.customer_email}
                  </div>
                </div>
              </div>
              
              <div className={styles.tableCell}>
                <span 
                  className={styles.statusBadge}
                  style={{ 
                    backgroundColor: getStatusColor(order.status_color),
                    color: 'white'
                  }}
                >
                  {order.status_name}
                </span>
              </div>
              
              <div className={styles.tableCell}>
                <span className={styles.itemCount}>
                  {order.item_count} items
                </span>
              </div>
              
              <div className={styles.tableCell}>
                <span className={styles.orderTotal}>
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
              
              <div className={styles.tableCell}>
                <span className={styles.orderDate}>
                  {formatDate(order.created_at)}
                </span>
              </div>
              
              <div className={styles.tableCell}>
                <Link 
                  href={`/admin/orders/${order.id}`}
                  className={styles.viewButton}
                >
                  Ver
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
