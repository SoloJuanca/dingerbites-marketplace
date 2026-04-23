'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './orders.module.css';

export default function OrdersTableView({
  orders,
  loading,
  pagination,
  onPageChange,
  onStatusModalOpen,
  getStatusColor,
  getStatusLabel,
  formatCurrency,
  formatDate,
}) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (orderId, e) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === orderId ? null : orderId));
  };

  const handleRowClick = (orderId) => {
    if (openMenuId) return;
    router.push(`/admin/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyState}>
          <p>No se encontraron pedidos</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.ordersTable}>
        <thead>
          <tr>
            <th>Numero</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Fecha</th>
            <th>Pago</th>
            <th className={styles.actionsHeader}></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className={styles.orderRow}
              onClick={() => handleRowClick(order.id)}
            >
              <td className={styles.orderNumber}>
                <strong>{order.order_number}</strong>
              </td>
              <td className={styles.customerInfo}>
                <div className={styles.customerName}>
                  {order.customer_name || 'Cliente invitado'}
                </div>
                <div className={styles.customerEmail}>
                  {order.customer_email}
                </div>
                {order.customer_phone && (
                  <div className={styles.customerPhone}>
                    {order.customer_phone}
                  </div>
                )}
              </td>
              <td className={styles.orderStatus}>
                <span
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(order.status_name) }}
                >
                  {getStatusLabel(order.status_name)}
                </span>
              </td>
              <td className={styles.orderTotal}>
                {formatCurrency(order.total_amount)}
              </td>
              <td className={styles.orderDate}>
                {formatDate(order.created_at)}
              </td>
              <td className={styles.paymentMethod}>
                {order.payment_method || '-'}
              </td>
              <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                <div
                  className={styles.actionMenuWrapper}
                  ref={openMenuId === order.id ? menuRef : null}
                >
                  <button
                    className={styles.menuToggle}
                    onClick={(e) => toggleMenu(order.id, e)}
                    aria-label="Acciones"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
                  </button>
                  {openMenuId === order.id && (
                    <div className={styles.actionMenu}>
                      <button
                        className={styles.menuItem}
                        onClick={() => {
                          router.push(`/admin/orders/${order.id}`);
                          setOpenMenuId(null);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        Ver detalles
                      </button>
                      <div className={styles.menuDivider} />
                      <button
                        className={styles.menuItem}
                        onClick={() => {
                          onStatusModalOpen(order);
                          setOpenMenuId(null);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
                        Cambiar estado
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className={styles.paginationButton}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
            Anterior
          </button>
          <span className={styles.paginationInfo}>
            {pagination.page} de {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className={styles.paginationButton}
          >
            Siguiente
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
