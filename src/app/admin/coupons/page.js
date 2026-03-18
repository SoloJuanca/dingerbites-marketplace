'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import { useAuth } from '../../../lib/AuthContext';
import styles from './coupons.module.css';

const defaultForm = {
  code: '',
  active: true,
  discount_type: 'percentage',
  discount_value: 10,
  max_discount_amount: '',
  min_order_amount: '',
  valid_from: '',
  expires_at: '',
  scope_type: 'global',
  scope_ids: '',
  target_type: 'all',
  target_user_id: '',
  target_email_normalized: '',
  usage_mode: 'single_use',
  max_redemptions_total: '',
  max_redemptions_per_user: '',
  source: 'ADMIN'
};

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toLocalInput(isoValue) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
}

function mapCouponToForm(coupon) {
  return {
    code: coupon.code || '',
    active: coupon.active !== false,
    discount_type: coupon.discount_type || 'percentage',
    discount_value: coupon.discount_value || 0,
    max_discount_amount: coupon.max_discount_amount ?? '',
    min_order_amount: coupon.min_order_amount ?? '',
    valid_from: toLocalInput(coupon.valid_from),
    expires_at: toLocalInput(coupon.expires_at),
    scope_type: coupon.scope_type || 'global',
    scope_ids: Array.isArray(coupon.scope_ids) ? coupon.scope_ids.join(', ') : '',
    target_type: coupon.target_type || 'all',
    target_user_id: coupon.target_user_id || '',
    target_email_normalized: coupon.target_email_normalized || '',
    usage_mode: coupon.usage_mode || 'single_use',
    max_redemptions_total: coupon.max_redemptions_total ?? '',
    max_redemptions_per_user: coupon.max_redemptions_per_user ?? '',
    source: coupon.source || 'ADMIN'
  };
}

function buildPayload(formData) {
  return {
    code: String(formData.code || '').trim().toUpperCase(),
    active: Boolean(formData.active),
    discount_type: formData.discount_type,
    discount_value: Number(formData.discount_value),
    max_discount_amount: formData.max_discount_amount === '' ? null : Number(formData.max_discount_amount),
    min_order_amount: formData.min_order_amount === '' ? 0 : Number(formData.min_order_amount),
    valid_from: toIso(formData.valid_from),
    expires_at: toIso(formData.expires_at),
    scope_type: formData.scope_type,
    scope_ids:
      formData.scope_type === 'global'
        ? []
        : String(formData.scope_ids || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
    target_type: formData.target_type,
    target_user_id: formData.target_type === 'user' ? String(formData.target_user_id || '').trim() : null,
    target_email_normalized:
      formData.target_type === 'email_segment'
        ? String(formData.target_email_normalized || '').trim().toLowerCase()
        : null,
    usage_mode: formData.usage_mode,
    max_redemptions_total: formData.max_redemptions_total === '' ? null : Number(formData.max_redemptions_total),
    max_redemptions_per_user:
      formData.max_redemptions_per_user === '' ? null : Number(formData.max_redemptions_per_user),
    source: formData.source || 'ADMIN'
  };
}

export default function AdminCouponsPage() {
  const { apiRequest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [showModal, setShowModal] = useState(false);

  const filteredCoupons = useMemo(() => {
    let list = [...coupons];
    if (activeFilter === 'active') list = list.filter((coupon) => coupon.active !== false);
    if (activeFilter === 'inactive') list = list.filter((coupon) => coupon.active === false);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((coupon) => `${coupon.code || ''} ${coupon.source || ''}`.toLowerCase().includes(q));
    }
    return list;
  }, [coupons, activeFilter, search]);

  async function loadCoupons() {
    setLoading(true);
    try {
      const response = await apiRequest('/api/admin/coupons');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar cupones');
      setCoupons(data.coupons || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error(error.message || 'No se pudieron cargar los cupones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  function openCreateModal() {
    setEditingCoupon(null);
    setFormData(defaultForm);
    setShowModal(true);
  }

  function openEditModal(coupon) {
    setEditingCoupon(coupon);
    setFormData(mapCouponToForm(coupon));
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingCoupon(null);
    setFormData(defaultForm);
  }

  async function handleToggleCoupon(coupon) {
    try {
      const response = await apiRequest(`/api/admin/coupons/${coupon.id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ active: !coupon.active })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el estado');
      toast.success(`Cupón ${!coupon.active ? 'activado' : 'desactivado'}`);
      await loadCoupons();
    } catch (error) {
      console.error('Error toggling coupon:', error);
      toast.error(error.message || 'Error al cambiar estado del cupón');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload(formData);
      const isEditing = Boolean(editingCoupon?.id);
      const endpoint = isEditing ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el cupón');

      toast.success(isEditing ? 'Cupón actualizado' : 'Cupón creado');
      closeModal();
      await loadCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error(error.message || 'Error al guardar cupón');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Gestión de Cupones">
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.pageTitle}>Cupones</h2>
            <p className={styles.pageSubtitle}>Crea, limita y monitorea cupones para proteger descuentos.</p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={openCreateModal}>
            + Nuevo cupón
          </button>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código o fuente..."
            className={styles.searchInput}
          />
          <div className={styles.filterTabs}>
            <button
              type="button"
              className={`${styles.filterTab} ${activeFilter === 'all' ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${activeFilter === 'active' ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter('active')}
            >
              Activos
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${activeFilter === 'inactive' ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter('inactive')}
            >
              Inactivos
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Cargando cupones...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No hay cupones</h3>
            <p>Crea tu primer cupón para iniciar promociones seguras.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredCoupons.map((coupon) => (
              <article key={coupon.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardCode}>{coupon.code}</h3>
                  <span className={`${styles.status} ${coupon.active ? styles.statusActive : styles.statusInactive}`}>
                    {coupon.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <p className={styles.cardLine}>
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}% de descuento`
                    : `$${coupon.discount_value} de descuento fijo`}
                </p>
                <p className={styles.cardLine}>Scope: {coupon.scope_type}</p>
                <p className={styles.cardLine}>Target: {coupon.target_type}</p>
                <p className={styles.cardLine}>Redenciones: {coupon.redemptions_count || 0}</p>
                {coupon.expires_at && <p className={styles.cardLine}>Expira: {new Date(coupon.expires_at).toLocaleString('es-MX')}</p>}

                <div className={styles.actions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => openEditModal(coupon)}>
                    Editar
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={() => handleToggleCoupon(coupon)}>
                    {coupon.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{editingCoupon ? 'Editar cupón' : 'Crear cupón'}</h3>
                <button type="button" className={styles.closeButton} onClick={closeModal}>x</button>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Código</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Activo</label>
                    <select
                      value={String(formData.active)}
                      onChange={(event) => setFormData((prev) => ({ ...prev, active: event.target.value === 'true' }))}
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Tipo descuento</label>
                    <select
                      value={formData.discount_type}
                      onChange={(event) => setFormData((prev) => ({ ...prev, discount_type: event.target.value }))}
                    >
                      <option value="percentage">Porcentaje</option>
                      <option value="fixed">Monto fijo</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Valor</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(event) => setFormData((prev) => ({ ...prev, discount_value: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Mínimo de compra</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.min_order_amount}
                      onChange={(event) => setFormData((prev) => ({ ...prev, min_order_amount: event.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Tope descuento</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.max_discount_amount}
                      onChange={(event) => setFormData((prev) => ({ ...prev, max_discount_amount: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Válido desde</label>
                    <input
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={(event) => setFormData((prev) => ({ ...prev, valid_from: event.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Expira en</label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(event) => setFormData((prev) => ({ ...prev, expires_at: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Scope</label>
                  <select
                    value={formData.scope_type}
                    onChange={(event) => setFormData((prev) => ({ ...prev, scope_type: event.target.value }))}
                  >
                    <option value="global">Global</option>
                    <option value="brand">Marca</option>
                    <option value="franchise">Franquicia</option>
                    <option value="category">Categoría</option>
                    <option value="subcategory">Subcategoría</option>
                    <option value="product">Producto</option>
                  </select>
                </div>

                {formData.scope_type !== 'global' && (
                  <div className={styles.field}>
                    <label>IDs de scope (separados por coma)</label>
                    <input
                      type="text"
                      value={formData.scope_ids}
                      onChange={(event) => setFormData((prev) => ({ ...prev, scope_ids: event.target.value }))}
                      placeholder="id1,id2,id3"
                    />
                  </div>
                )}

                <div className={styles.field}>
                  <label>Target</label>
                  <select
                    value={formData.target_type}
                    onChange={(event) => setFormData((prev) => ({ ...prev, target_type: event.target.value }))}
                  >
                    <option value="all">Todos</option>
                    <option value="user">Usuario específico</option>
                    <option value="email_segment">Email específico</option>
                  </select>
                </div>

                {formData.target_type === 'user' && (
                  <div className={styles.field}>
                    <label>User ID</label>
                    <input
                      type="text"
                      value={formData.target_user_id}
                      onChange={(event) => setFormData((prev) => ({ ...prev, target_user_id: event.target.value }))}
                      required
                    />
                  </div>
                )}

                {formData.target_type === 'email_segment' && (
                  <div className={styles.field}>
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.target_email_normalized}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, target_email_normalized: event.target.value.toLowerCase() }))
                      }
                      required
                    />
                  </div>
                )}

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label>Modo de uso</label>
                    <select
                      value={formData.usage_mode}
                      onChange={(event) => setFormData((prev) => ({ ...prev, usage_mode: event.target.value }))}
                    >
                      <option value="single_use">Uso único</option>
                      <option value="multi_use">Multi uso</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Límite total</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_redemptions_total}
                      onChange={(event) => setFormData((prev) => ({ ...prev, max_redemptions_total: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Límite por usuario/email</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_redemptions_per_user}
                    onChange={(event) => setFormData((prev) => ({ ...prev, max_redemptions_per_user: event.target.value }))}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Guardando...' : editingCoupon ? 'Actualizar' : 'Crear'}
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
