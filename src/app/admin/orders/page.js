'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import OrdersToolbar from './OrdersToolbar';
import OrdersTableView from './OrdersTableView';
import OrdersKanbanView from './OrdersKanbanView';
import styles from './orders.module.css';

const FALLBACK_STATUS_OPTIONS = [
  { id: 'pending', name: 'pending', label: 'Pendiente' },
  { id: 'confirmed', name: 'confirmed', label: 'Confirmado' },
  { id: 'processing', name: 'processing', label: 'En proceso' },
  { id: 'shipped', name: 'shipped', label: 'Enviado' },
  { id: 'delivered', name: 'delivered', label: 'Entregado' },
  { id: 'cancelled', name: 'cancelled', label: 'Cancelado' },
  { id: 'refunded', name: 'refunded', label: 'Reembolsado' },
];

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const STATUS_COLORS = {
  pending: '#fbbf24',
  confirmed: '#6b21a8',
  processing: '#8b5cf6',
  shipped: '#10b981',
  delivered: '#059669',
  cancelled: '#ef4444',
  refunded: '#6b7280',
};

function getStatusColor(statusName) {
  return STATUS_COLORS[statusName] || '#6b7280';
}

function getStatusLabel(statusName) {
  return STATUS_LABELS[statusName] || statusName;
}

export default function AdminOrders() {
  const { apiRequest, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [viewMode, setViewMode] = useState('table');
  const [sortBy, setSortBy] = useState('newest');

  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadOrderStatuses();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [filters, pagination.page, isAuthenticated]);

  const loadOrderStatuses = async () => {
    try {
      const response = await apiRequest('/api/order-statuses');
      if (response.ok) {
        const data = await response.json();
        const fetched = (data.statuses || []).map((s) => ({
          id: s.id,
          name: s.name,
          label: STATUS_LABELS[s.name] || s.description || s.name,
          color: s.color || STATUS_COLORS[s.name] || '#6b7280',
        }));
        const fetchedNames = new Set(fetched.map((s) => s.name));
        const merged = [
          ...fetched,
          ...FALLBACK_STATUS_OPTIONS.filter((f) => !fetchedNames.has(f.name)),
        ];
        setOrderStatuses(merged);
      }
    } catch (error) {
      console.error('Error loading order statuses:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await apiRequest(`/api/admin/orders?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      } else {
        toast.error('Error al cargar los pedidos');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleStatusChange = async (orderId, newStatusId) => {
    try {
      setUpdatingStatus(true);
      const response = await apiRequest(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: newStatusId }),
      });

      if (response.ok) {
        toast.success('Estado del pedido actualizado');
        setStatusModalOrder(null);
        loadOrders();
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleKanbanMove = async (orderId, targetStatus) => {
    if (!targetStatus?.id) return;

    let previousOrder = null;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        previousOrder = o;
        return {
          ...o,
          status_id: targetStatus.id,
          status_name: targetStatus.name || o.status_name,
        };
      })
    );

    try {
      const response = await apiRequest(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: targetStatus.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status for order ${orderId}`);
      }
    } catch (error) {
      console.error('Error moving order in kanban:', error);
      if (previousOrder) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? previousOrder : o)));
      }
      toast.error('No se pudo mover el pedido');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const effectiveStatuses = orderStatuses.length > 0 ? orderStatuses : FALLBACK_STATUS_OPTIONS;

  const sortedOrders = useMemo(() => {
    const sorted = [...orders];
    switch (sortBy) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'highest':
        sorted.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
        break;
      case 'lowest':
        sorted.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
        break;
      default:
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return sorted;
  }, [orders, sortBy]);

  return (
    <AdminLayout title="Pedidos">
      <div className={styles.container}>
        <OrdersToolbar
          filters={filters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          effectiveStatuses={effectiveStatuses}
          orders={orders}
          getStatusColor={getStatusColor}
        />

        {viewMode === 'table' ? (
          <OrdersTableView
            orders={sortedOrders}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onStatusModalOpen={setStatusModalOrder}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        ) : (
          <OrdersKanbanView
            orders={sortedOrders}
            loading={loading}
            effectiveStatuses={effectiveStatuses}
            onStatusModalOpen={setStatusModalOrder}
            onMoveOrder={handleKanbanMove}
            getStatusColor={getStatusColor}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Status Update Modal */}
      {statusModalOrder && (
        <div className={styles.modalOverlay} onClick={() => !updatingStatus && setStatusModalOrder(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Cambiar Estado</h3>
              <button
                className={styles.modalClose}
                onClick={() => !updatingStatus && setStatusModalOrder(null)}
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalOrderInfo}>
                Pedido <strong>{statusModalOrder.order_number}</strong>
              </p>
              <p className={styles.modalCurrentStatus}>
                Estado actual:{' '}
                <span
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(statusModalOrder.status_name) }}
                >
                  {getStatusLabel(statusModalOrder.status_name)}
                </span>
              </p>

              <div className={styles.statusOptionsList}>
                {effectiveStatuses.map((status) => {
                  const isActive =
                    statusModalOrder.status_id === status.id ||
                    statusModalOrder.status_id === status.name ||
                    statusModalOrder.status_name === status.name;
                  return (
                    <button
                      key={status.id}
                      className={`${styles.statusOption} ${isActive ? styles.statusOptionActive : ''}`}
                      onClick={() => handleStatusChange(statusModalOrder.id, status.id)}
                      disabled={updatingStatus || isActive}
                    >
                      <span
                        className={styles.statusDot}
                        style={{ backgroundColor: status.color || getStatusColor(status.name || status.id) }}
                      />
                      <span className={styles.statusOptionLabel}>{status.label}</span>
                      {isActive && (
                        <span className="material-symbols-outlined" style={{ fontSize: 16, marginLeft: 'auto' }}>check</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {updatingStatus && (
                <div className={styles.modalUpdating}>
                  <div className={styles.spinnerSmall}></div>
                  <span>Actualizando...</span>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setStatusModalOrder(null)}
                disabled={updatingStatus}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
