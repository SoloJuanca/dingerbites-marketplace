'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import { useAuth } from '../../../lib/AuthContext';
import styles from './expenses.module.css';

const CATEGORY_OPTIONS = [
  { value: 'renta', label: 'Renta' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'envios', label: 'Envíos' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' }
];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

const defaultForm = {
  concept: '',
  category: 'otros',
  amount: '',
  date: todayInput(),
  notes: ''
};

function toDateInput(isoValue) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function mapExpenseToForm(expense) {
  return {
    concept: expense.concept || '',
    category: expense.category || 'otros',
    amount: expense.amount ?? '',
    date: toDateInput(expense.date),
    notes: expense.notes || ''
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
}

function categoryLabel(value) {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label || value;
}

export default function AdminExpensesPage() {
  const { apiRequest, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', category: '' });
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [showModal, setShowModal] = useState(false);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.category) params.set('category', filters.category);
    return params;
  }, [filters]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/admin/expenses?${buildParams().toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar gastos');
      setExpenses(data.expenses || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error(error.message || 'No se pudieron cargar los gastos');
    } finally {
      setLoading(false);
    }
  }, [apiRequest, buildParams]);

  useEffect(() => {
    if (isAuthenticated) loadExpenses();
  }, [isAuthenticated, loadExpenses]);

  const summaryByCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const key = e.category || 'otros';
      map[key] = (map[key] || 0) + Number(e.amount || 0);
    });
    return map;
  }, [expenses]);

  function openCreateModal() {
    setEditingExpense(null);
    setFormData(defaultForm);
    setShowModal(true);
  }

  function openEditModal(expense) {
    setEditingExpense(expense);
    setFormData(mapExpenseToForm(expense));
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingExpense(null);
    setFormData(defaultForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        concept: String(formData.concept || '').trim(),
        category: formData.category,
        amount: Number(formData.amount),
        date: formData.date ? new Date(formData.date).toISOString() : null,
        notes: formData.notes ? String(formData.notes).trim() : null
      };
      const isEditing = Boolean(editingExpense?.id);
      const endpoint = isEditing ? `/api/admin/expenses/${editingExpense.id}` : '/api/admin/expenses';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el gasto');

      toast.success(isEditing ? 'Gasto actualizado' : 'Gasto registrado');
      closeModal();
      await loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(error.message || 'Error al guardar gasto');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense) {
    if (!window.confirm(`¿Eliminar el gasto "${expense.concept}"?`)) return;
    try {
      const response = await apiRequest(`/api/admin/expenses/${expense.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar el gasto');
      toast.success('Gasto eliminado');
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error(error.message || 'Error al eliminar gasto');
    }
  }

  return (
    <AdminLayout title="Gastos">
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.pageTitle}>Gastos</h2>
            <p className={styles.pageSubtitle}>
              Registra los gastos operativos para calcular la ganancia neta del negocio.
            </p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={openCreateModal}>
            + Nuevo gasto
          </button>
        </div>

        {/* Filters */}
        <section className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="dateFrom">Desde</label>
            <input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="dateTo">Hasta</label>
            <input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="category">Categoría</label>
            <select
              id="category"
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Todas</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={loadExpenses} disabled={loading}>
            {loading ? 'Cargando…' : 'Aplicar'}
          </button>
        </section>

        {/* Summary */}
        <section className={styles.summaryBar}>
          <div className={styles.totalBox}>
            <span className={styles.totalLabel}>Total del periodo</span>
            <span className={styles.totalValue}>{formatCurrency(total)}</span>
          </div>
          <div className={styles.chipRow}>
            {Object.entries(summaryByCategory).map(([cat, amount]) => (
              <span key={cat} className={styles.chip}>
                <span className={styles.chipLabel}>{categoryLabel(cat)}</span>
                <span className={styles.chipValue}>{formatCurrency(amount)}</span>
              </span>
            ))}
          </div>
        </section>

        {loading ? (
          <div className={styles.loading}>Cargando gastos…</div>
        ) : expenses.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No hay gastos registrados</h3>
            <p>Registra tu primer gasto para calcular la ganancia neta.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{toDateInput(expense.date)}</td>
                    <td className={styles.concept}>{expense.concept}</td>
                    <td>
                      <span className={styles.categoryBadge}>{categoryLabel(expense.category)}</span>
                    </td>
                    <td className={styles.amount}>{formatCurrency(expense.amount)}</td>
                    <td className={styles.notes}>{expense.notes || '—'}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => openEditModal(expense)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={styles.linkButtonDanger}
                          onClick={() => handleDelete(expense)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{editingExpense ? 'Editar gasto' : 'Registrar gasto'}</h3>
                <button type="button" className={styles.closeButton} onClick={closeModal}>
                  x
                </button>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label>Concepto</label>
                  <input
                    type="text"
                    value={formData.concept}
                    onChange={(event) => setFormData((prev) => ({ ...prev, concept: event.target.value }))}
                    placeholder="Ej. Publicidad en Facebook"
                    required
                  />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Categoría</label>
                    <select
                      value={formData.category}
                      onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Monto</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Notas (opcional)</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Detalles adicionales del gasto"
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Guardando…' : editingExpense ? 'Actualizar' : 'Registrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
