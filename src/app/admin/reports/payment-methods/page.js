'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from './payment-methods.module.css';

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Todos los métodos' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Tarjeta', label: 'Tarjeta' },
  { value: 'Stripe', label: 'Stripe' },
  { value: 'Otros', label: 'Otros' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'processing', label: 'En proceso' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'refunded', label: 'Reembolsado' }
];

const GROUP_BY_OPTIONS = [
  { value: '', label: 'Sin agrupar' },
  { value: 'day', label: 'Por día' },
  { value: 'week', label: 'Por semana' },
  { value: 'month', label: 'Por mes' }
];

export default function PaymentMethodsReportPage() {
  const router = useRouter();
  const { apiRequest, isAuthenticated } = useAuth();
  const [report, setReport] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    payment_method: '',
    status: '',
    created_by: '',
    groupBy: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.payment_method) params.set('payment_method', filters.payment_method);
    if (filters.status) params.set('status', filters.status);
    if (filters.created_by) params.set('created_by', filters.created_by);
    if (filters.groupBy) params.set('groupBy', filters.groupBy);
    params.set('page', String(pagination.page));
    params.set('limit', String(pagination.limit));
    return params;
  }, [filters, pagination.page, pagination.limit]);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/admin/reports/payment-methods?${buildParams().toString()}`;
      const response = await apiRequest(url);
      if (!response.ok) throw new Error('Error al cargar el reporte');
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el reporte de pagos');
    } finally {
      setLoading(false);
    }
  }, [apiRequest, buildParams]);

  useEffect(() => {
    if (isAuthenticated) loadReport();
  }, [isAuthenticated, loadReport]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadUsers = async () => {
      try {
        const res = await apiRequest('/api/admin/users?limit=200');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || data.data || []);
        }
      } catch {
        setUsers([]);
      }
    };
    loadUsers();
  }, [isAuthenticated, apiRequest]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = buildParams();
      params.set('format', 'csv');
      params.delete('page');
      params.delete('limit');
      const response = await apiRequest(`/api/admin/reports/payment-methods?${params.toString()}`);
      if (!response.ok) throw new Error('Error al exportar');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-pagos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exportación descargada');
    } catch (err) {
      console.error(err);
      toast.error('Error al exportar CSV');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  const formatDate = (dateString) =>
    dateString
      ? new Date(dateString).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '—';

  const getStatusColor = (statusName) => {
    const map = {
      pending: '#fbbf24',
      confirmed: '#6b21a8',
      processing: '#8b5cf6',
      shipped: '#10b981',
      delivered: '#059669',
      cancelled: '#ef4444',
      refunded: '#6b7280'
    };
    return map[statusName] || '#6b7280';
  };

  const summary = report?.summary;
  const orders = report?.orders || [];
  const paginationData = report?.pagination;
  const grouped = report?.grouped;

  return (
    <AdminLayout title="Reporte de métodos de pago">
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Reporte de métodos de pago</h1>
          <p className={styles.subtitle}>
            Resumen por método de pago para cierre de caja y revisión administrativa
          </p>
        </header>

        {/* Summary cards */}
        {summary && (
          <section className={styles.summaryGrid}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Total de órdenes</span>
              <span className={styles.cardValue}>{summary.total_orders}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Total vendido</span>
              <span className={styles.cardValue}>{formatCurrency(summary.total_amount)}</span>
            </div>
            <div className={`${styles.card} ${styles.cardEfectivo}`}>
              <span className={styles.cardLabel}>Efectivo</span>
              <span className={styles.cardValue}>
                {formatCurrency(summary.by_method?.Efectivo?.amount)} ({summary.by_method?.Efectivo?.count || 0})
              </span>
            </div>
            <div className={`${styles.card} ${styles.cardTarjeta}`}>
              <span className={styles.cardLabel}>Tarjeta</span>
              <span className={styles.cardValue}>
                {formatCurrency(summary.by_method?.Tarjeta?.amount)} ({summary.by_method?.Tarjeta?.count || 0})
              </span>
            </div>
            <div className={`${styles.card} ${styles.cardStripe}`}>
              <span className={styles.cardLabel}>Stripe</span>
              <span className={styles.cardValue}>
                {formatCurrency(summary.by_method?.Stripe?.amount)} ({summary.by_method?.Stripe?.count || 0})
              </span>
            </div>
            <div className={`${styles.card} ${styles.cardOtros}`}>
              <span className={styles.cardLabel}>Otros</span>
              <span className={styles.cardValue}>
                {formatCurrency(summary.by_method?.Otros?.amount)} ({summary.by_method?.Otros?.count || 0})
              </span>
            </div>
          </section>
        )}

        {/* Filters */}
        <section className={styles.filtersSection}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="dateFrom">Desde</label>
              <input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="dateTo">Hasta</label>
              <input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="payment_method">Método de pago</label>
              <select
                id="payment_method"
                value={filters.payment_method}
                onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                className={styles.select}
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="status">Estatus orden</label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={styles.select}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="created_by">Cajero / Usuario</label>
              <select
                id="created_by"
                value={filters.created_by}
                onChange={(e) => handleFilterChange('created_by', e.target.value)}
                className={styles.select}
              >
                <option value="">Todos</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="groupBy">Agrupar por</label>
              <select
                id="groupBy"
                value={filters.groupBy}
                onChange={(e) => handleFilterChange('groupBy', e.target.value)}
                className={styles.select}
              >
                {GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button
              type="button"
              onClick={loadReport}
              disabled={loading}
              className={styles.buttonPrimary}
            >
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting || !report}
              className={styles.buttonSecondary}
            >
              {exporting ? 'Exportando…' : 'Exportar CSV'}
            </button>
          </div>
        </section>

        {/* Grouped summary (when groupBy is set) */}
        {grouped && grouped.length > 0 && (
          <section className={styles.tableSection}>
            <h2 className={styles.sectionTitle}>Resumen agrupado</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Órdenes</th>
                    <th>Total</th>
                    <th>Efectivo</th>
                    <th>Tarjeta</th>
                    <th>Stripe</th>
                    <th>Otros</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((row) => (
                    <tr key={row.period}>
                      <td>{row.period}</td>
                      <td>{row.orders}</td>
                      <td>{formatCurrency(row.total)}</td>
                      <td>{formatCurrency(row.byMethod?.Efectivo)}</td>
                      <td>{formatCurrency(row.byMethod?.Tarjeta)}</td>
                      <td>{formatCurrency(row.byMethod?.Stripe)}</td>
                      <td>{formatCurrency(row.byMethod?.Otros)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Orders table */}
        <section className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Detalle de órdenes</h2>
          <div className={styles.tableWrapper}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Cargando reporte…</p>
              </div>
            ) : orders.length === 0 ? (
              <div className={styles.empty}>No hay órdenes con los filtros aplicados.</div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Total</th>
                      <th>Método de pago</th>
                      <th>Estatus</th>
                      <th>Cajero / Usuario</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className={styles.row}>
                        <td className={styles.orderNumber}>{order.order_number || order.id}</td>
                        <td className={styles.date}>{formatDate(order.created_at)}</td>
                        <td className={styles.customer}>
                          {order.customer_name || order.customer_email || 'Invitado'}
                        </td>
                        <td className={styles.total}>{formatCurrency(order.total_amount)}</td>
                        <td className={styles.method}>{order.payment_method_display || order.payment_method || '—'}</td>
                        <td>
                          <span
                            className={styles.badge}
                            style={{ backgroundColor: getStatusColor(order.status_name) }}
                          >
                            {order.status_name || '—'}
                          </span>
                        </td>
                        <td className={styles.cashier}>{order.cashier_name || '—'}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                            className={styles.linkButton}
                            title="Ver orden"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {paginationData && paginationData.totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      onClick={() => handlePageChange(paginationData.currentPage - 1)}
                      disabled={!paginationData.hasPrevPage}
                      className={styles.pageButton}
                    >
                      Anterior
                    </button>
                    <span className={styles.pageInfo}>
                      Página {paginationData.currentPage} de {paginationData.totalPages} ({paginationData.total} órdenes)
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(paginationData.currentPage + 1)}
                      disabled={!paginationData.hasNextPage}
                      className={styles.pageButton}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Totals summary at bottom */}
        {summary && orders.length > 0 && (
          <section className={styles.totalsFooter}>
            <div className={styles.totalsRow}>
              <span>Total órdenes en este reporte:</span>
              <strong>{summary.total_orders}</strong>
            </div>
            <div className={styles.totalsRow}>
              <span>Total vendido:</span>
              <strong>{formatCurrency(summary.total_amount)}</strong>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
