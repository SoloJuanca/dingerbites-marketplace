'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './orders.module.css';

export default function AdminOrders() {
  const router = useRouter();
  const { apiRequest, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [filters, pagination.page, isAuthenticated]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await apiRequest(`/api/admin/orders?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
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
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleStatusChange = async (orderId, newStatusId) => {
    try {
      const response = await apiRequest(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: newStatusId })
      });

      if (response.ok) {
        toast.success('Estado del pedido actualizado');
        loadOrders(); // Reload orders to get updated data
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al conectar con el servidor');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (statusName) => {
    const statusColors = {
      'pending': '#fbbf24',
      'confirmed': '#3b82f6',
      'processing': '#8b5cf6',
      'shipped': '#10b981',
      'delivered': '#059669',
      'cancelled': '#ef4444',
      'refunded': '#6b7280'
    };
    return statusColors[statusName] || '#6b7280';
  };

  return (
    <AdminLayout title="Gestión de Pedidos">
      <div className={styles.container}>
        {/* Filters Section */}
        <div className={styles.filtersSection}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="status">Estado:</label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="processing">En proceso</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="cancelled">Cancelado</option>
                <option value="refunded">Reembolsado</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="search">Buscar:</label>
              <input
                type="text"
                id="search"
                placeholder="Número de pedido, email, nombre..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="dateFrom">Desde:</label>
              <input
                type="date"
                id="dateFrom"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="dateTo">Hasta:</label>
              <input
                type="date"
                id="dateTo"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className={styles.filterInput}
              />
            </div>
          </div>

          <button 
            onClick={loadOrders}
            className={styles.refreshButton}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Actualizar
          </button>
        </div>

        {/* Orders Table */}
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Cargando pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No se encontraron pedidos</p>
            </div>
          ) : (
            <>
              <table className={styles.ordersTable}>
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Fecha</th>
                    <th>Método de Pago</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className={styles.orderRow}>
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
                          {order.status_name}
                        </span>
                      </td>
                      <td className={styles.orderTotal}>
                        <strong>{formatCurrency(order.total_amount)}</strong>
                      </td>
                      <td className={styles.orderDate}>
                        {formatDate(order.created_at)}
                      </td>
                      <td className={styles.paymentMethod}>
                        {order.payment_method || 'No especificado'}
                      </td>
                      <td className={styles.actions}>
                        <button
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className={styles.viewButton}
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        <select
                          value={order.status_id}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={styles.statusSelect}
                        >
                          <option value="pending">Pendiente</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="processing">En proceso</option>
                          <option value="shipped">Enviado</option>
                          <option value="delivered">Entregado</option>
                          <option value="cancelled">Cancelado</option>
                          <option value="refunded">Reembolsado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={styles.paginationButton}
                  >
                    ← Anterior
                  </button>
                  
                  <span className={styles.paginationInfo}>
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={styles.paginationButton}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary Stats */}
        <div className={styles.summaryStats}>
          <div className={styles.statCard}>
            <h3>Total de Pedidos</h3>
            <p className={styles.statNumber}>{pagination.total}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Página Actual</h3>
            <p className={styles.statNumber}>{pagination.page}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Pedidos por Página</h3>
            <p className={styles.statNumber}>{pagination.limit}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
