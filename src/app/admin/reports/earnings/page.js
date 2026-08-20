'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from './earnings.module.css';

const STATUS_SCOPE_OPTIONS = [
  { value: 'paid', label: 'Pagadas / completadas' },
  { value: 'all', label: 'Todas (excepto canceladas/reembolsadas)' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'Cualquiera (según alcance)' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'processing', label: 'En proceso' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' }
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
}

export default function EarningsReportPage() {
  const { apiRequest, isAuthenticated } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    statusScope: 'paid',
    status: ''
  });

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.statusScope) params.set('statusScope', filters.statusScope);
    if (filters.status) params.set('status', filters.status);
    return params;
  }, [filters]);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/admin/reports/earnings?${buildParams().toString()}`;
      const response = await apiRequest(url);
      if (!response.ok) throw new Error('Error al cargar el reporte');
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el reporte de ganancias');
    } finally {
      setLoading(false);
    }
  }, [apiRequest, buildParams]);

  useEffect(() => {
    if (isAuthenticated) loadReport();
  }, [isAuthenticated, loadReport]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = buildParams();
      params.set('format', 'csv');
      const response = await apiRequest(`/api/admin/reports/earnings?${params.toString()}`);
      if (!response.ok) throw new Error('Error al exportar');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ganancias-${new Date().toISOString().slice(0, 10)}.csv`;
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

  const summary = report?.summary;
  const products = report?.products || [];
  const categories = report?.categories || [];
  const expensesByCategory = report?.expenses_by_category || {};

  return (
    <AdminLayout title="Ganancias">
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Ganancias</h1>
            <p className={styles.subtitle}>
              Ingresos, costo de productos, gastos y ganancia neta del periodo seleccionado.
            </p>
          </div>
          <Link href="/admin/expenses" className={styles.buttonSecondary}>
            Gestionar gastos
          </Link>
        </header>

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
              <label htmlFor="statusScope">Alcance</label>
              <select
                id="statusScope"
                value={filters.statusScope}
                onChange={(e) => handleFilterChange('statusScope', e.target.value)}
                className={styles.select}
              >
                {STATUS_SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="status">Estatus específico</label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={styles.select}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'any'} value={opt.value}>
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

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Cargando reporte…</p>
          </div>
        ) : !summary ? (
          <div className={styles.empty}>No hay datos para el periodo seleccionado.</div>
        ) : (
          <>
            {/* Summary cards */}
            <section className={styles.summaryGrid}>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Ingresos (mercancía)</span>
                <span className={styles.cardValue}>{formatCurrency(summary.gross_revenue)}</span>
                <span className={styles.cardHint}>{summary.orders_count} órdenes</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Descuentos</span>
                <span className={styles.cardValue}>-{formatCurrency(summary.discounts)}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Costo de productos (COGS)</span>
                <span className={styles.cardValue}>-{formatCurrency(summary.cogs)}</span>
              </div>
              <div className={`${styles.card} ${styles.cardAccent}`}>
                <span className={styles.cardLabel}>Ganancia bruta</span>
                <span className={styles.cardValue}>{formatCurrency(summary.gross_profit)}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Gastos</span>
                <span className={styles.cardValue}>-{formatCurrency(summary.expenses_total)}</span>
              </div>
              <div
                className={`${styles.card} ${
                  summary.net_profit >= 0 ? styles.cardPositive : styles.cardNegative
                }`}
              >
                <span className={styles.cardLabel}>Ganancia neta</span>
                <span className={styles.cardValue}>{formatCurrency(summary.net_profit)}</span>
                <span className={styles.cardHint}>Margen {summary.net_margin_pct}%</span>
              </div>
            </section>

            {/* Waterfall / breakdown of how net profit is computed */}
            <section className={styles.tableSection}>
              <h2 className={styles.sectionTitle}>Desglose de la ganancia</h2>
              <div className={styles.breakdownList}>
                <div className={styles.breakdownRow}>
                  <span>Ingresos por productos</span>
                  <strong>{formatCurrency(summary.product_revenue)}</strong>
                </div>
                {summary.service_revenue > 0 && (
                  <div className={styles.breakdownRow}>
                    <span>Ingresos por servicios</span>
                    <strong>{formatCurrency(summary.service_revenue)}</strong>
                  </div>
                )}
                <div className={styles.breakdownRow}>
                  <span>Descuentos aplicados</span>
                  <strong className={styles.negative}>-{formatCurrency(summary.discounts)}</strong>
                </div>
                <div className={`${styles.breakdownRow} ${styles.subtotal}`}>
                  <span>Ingresos netos</span>
                  <strong>{formatCurrency(summary.net_revenue)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Costo de productos vendidos (COGS)</span>
                  <strong className={styles.negative}>-{formatCurrency(summary.cogs)}</strong>
                </div>
                <div className={`${styles.breakdownRow} ${styles.subtotal}`}>
                  <span>Ganancia bruta</span>
                  <strong>{formatCurrency(summary.gross_profit)}</strong>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Gastos operativos</span>
                  <strong className={styles.negative}>-{formatCurrency(summary.expenses_total)}</strong>
                </div>
                <div className={`${styles.breakdownRow} ${styles.grandTotal}`}>
                  <span>Ganancia neta</span>
                  <strong>{formatCurrency(summary.net_profit)}</strong>
                </div>
                <div className={styles.breakdownNote}>
                  Envío cobrado a clientes en el periodo: {formatCurrency(summary.shipping_collected)} (no
                  incluido en la ganancia).
                </div>
              </div>
            </section>

            {/* Expenses by category */}
            {Object.keys(expensesByCategory).length > 0 && (
              <section className={styles.tableSection}>
                <h2 className={styles.sectionTitle}>Gastos por categoría</h2>
                <div className={styles.chipRow}>
                  {Object.entries(expensesByCategory).map(([cat, amount]) => (
                    <span key={cat} className={styles.chip}>
                      <span className={styles.chipLabel}>{cat}</span>
                      <span className={styles.chipValue}>{formatCurrency(amount)}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Profit by category */}
            <section className={styles.tableSection}>
              <h2 className={styles.sectionTitle}>Ganancia por categoría</h2>
              <div className={styles.tableWrapper}>
                {categories.length === 0 ? (
                  <div className={styles.empty}>Sin ventas de productos en el periodo.</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th>Ingresos</th>
                        <th>Costo</th>
                        <th>Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat.category_id || cat.category_name}>
                          <td>{cat.category_name}</td>
                          <td>{formatCurrency(cat.revenue)}</td>
                          <td>{formatCurrency(cat.cost)}</td>
                          <td className={cat.profit >= 0 ? styles.positive : styles.negative}>
                            {formatCurrency(cat.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Profit by product */}
            <section className={styles.tableSection}>
              <h2 className={styles.sectionTitle}>Ganancia por producto</h2>
              <div className={styles.tableWrapper}>
                {products.length === 0 ? (
                  <div className={styles.empty}>Sin ventas de productos en el periodo.</div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Unidades</th>
                        <th>Ingresos</th>
                        <th>Costo</th>
                        <th>Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.product_id || p.product_name}>
                          <td>{p.product_name}</td>
                          <td>{p.quantity}</td>
                          <td>{formatCurrency(p.revenue)}</td>
                          <td>{formatCurrency(p.cost)}</td>
                          <td className={p.profit >= 0 ? styles.positive : styles.negative}>
                            {formatCurrency(p.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
