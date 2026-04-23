'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './orders.module.css';

export default function OrdersKanbanView({
  orders,
  loading,
  effectiveStatuses,
  onStatusModalOpen,
  onMoveOrder,
  getStatusColor,
  formatCurrency,
  formatDate,
}) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [draggingOrderId, setDraggingOrderId] = useState(null);
  const [dropTargetStatusId, setDropTargetStatusId] = useState(null);
  const didDragRef = useRef(false);

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

  const handleCardDragStart = (order, e) => {
    didDragRef.current = true;
    setOpenMenuId(null);
    setDraggingOrderId(order.id);
    setDropTargetStatusId(null);

    try {
      e.dataTransfer.setData('text/plain', String(order.id));
      e.dataTransfer.effectAllowed = 'move';
    } catch (_) {
      // Some browsers can throw; drag will still work visually.
    }
  };

  const handleCardDragEnd = () => {
    setDraggingOrderId(null);
    setDropTargetStatusId(null);
    // Prevent accidental click navigation right after drop.
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  };

  const handleColumnDragOver = (col, e) => {
    // Required so drop can happen.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetStatusId(col.id);
  };

  const handleColumnDragLeave = (col, e) => {
    // Only clear when actually leaving the column container.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropTargetStatusId((prev) => (prev === col.id ? null : prev));
  };

  const handleColumnDrop = (col, e) => {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData('text/plain') || draggingOrderId);
    setDraggingOrderId(null);
    setDropTargetStatusId(null);

    if (!draggedId || !onMoveOrder) return;

    const draggedOrder = orders.find((o) => o.id === draggedId);
    const alreadyInColumn =
      draggedOrder && (draggedOrder.status_name === col.name || draggedOrder.status_id === col.id);
    if (alreadyInColumn) return;

    onMoveOrder(draggedId, col);
  };

  const columns = useMemo(() => {
    return effectiveStatuses.map((status) => ({
      ...status,
      orders: orders.filter(
        (o) => o.status_name === status.name || o.status_id === status.id
      ),
    }));
  }, [orders, effectiveStatuses]);

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

  return (
    <div className={styles.kanbanBoard}>
      {columns.map((col) => (
        <div
          key={col.id}
          className={`${styles.kanbanColumn} ${dropTargetStatusId === col.id ? styles.kanbanColumnDropActive : ''}`}
          onDragOver={(e) => handleColumnDragOver(col, e)}
          onDragLeave={(e) => handleColumnDragLeave(col, e)}
          onDrop={(e) => handleColumnDrop(col, e)}
        >
          <div className={styles.kanbanColumnHeader}>
            <span
              className={styles.kanbanColumnDot}
              style={{ backgroundColor: col.color || getStatusColor(col.name) }}
            />
            <span className={styles.kanbanColumnTitle}>{col.label}</span>
            <span className={styles.kanbanColumnCount}>{col.orders.length}</span>
          </div>

          <div className={styles.kanbanColumnBody}>
            {col.orders.length === 0 ? (
              <div className={styles.kanbanColumnEmpty}>Sin pedidos</div>
            ) : (
              col.orders.map((order) => (
                <div
                  key={order.id}
                  className={`${styles.kanbanCard} ${draggingOrderId === order.id ? styles.kanbanCardDragging : ''}`}
                  draggable
                  onDragStart={(e) => handleCardDragStart(order, e)}
                  onDragEnd={handleCardDragEnd}
                  onClick={() => {
                    if (didDragRef.current) return;
                    router.push(`/admin/orders/${order.id}`);
                  }}
                >
                  <div className={styles.kanbanCardTop}>
                    <span className={styles.kanbanCardOrder}>
                      {order.order_number}
                    </span>
                    <div
                      className={styles.kanbanCardMenu}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className={styles.actionMenuWrapper}
                        ref={openMenuId === order.id ? menuRef : null}
                      >
                        <button
                          className={styles.menuToggle}
                          onClick={(e) => toggleMenu(order.id, e)}
                          aria-label="Acciones"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>more_vert</span>
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
                    </div>
                  </div>

                  <div className={styles.kanbanCardCustomer}>
                    {order.customer_name || 'Cliente invitado'}
                  </div>

                  <div className={styles.kanbanCardMeta}>
                    <div className={styles.kanbanCardMetaRow}>
                      <span>{formatDate(order.created_at)}</span>
                      <span className={styles.kanbanCardAmount}>
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                    <div className={styles.kanbanCardMetaRow}>
                      <span>{order.payment_method || '-'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
