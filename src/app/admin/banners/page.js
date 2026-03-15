'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import { confirmToast } from '../../../lib/toastHelpers';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './banners.module.css';

const INITIAL_FORM = {
  title: '',
  subtitle: '',
  image_url: '',
  mobile_image_url: '',
  cta_label: '',
  cta_url: '',
  sort_order: 0,
  is_active: true,
  starts_at: '',
  ends_at: ''
};

export default function AdminBannersPage() {
  const { apiRequest } = useAuth();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBanners();
  }, []);

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    [banners]
  );

  const loadBanners = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/admin/banners');
      if (!response.ok) {
        toast.error('No se pudieron cargar los banners');
        return;
      }
      const data = await response.json();
      setBanners(Array.isArray(data.banners) ? data.banners : []);
    } catch (error) {
      console.error('Error loading banners:', error);
      toast.error('Error al cargar banners');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData(INITIAL_FORM);
    setShowModal(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      mobile_image_url: banner.mobile_image_url || '',
      cta_label: banner.cta_label || '',
      cta_url: banner.cta_url || '',
      sort_order: Number(banner.sort_order || 0),
      is_active: banner.is_active !== false,
      starts_at: toDatetimeLocal(banner.starts_at),
      ends_at: toDatetimeLocal(banner.ends_at)
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingBanner(null);
    setFormData(INITIAL_FORM);
  };

  const handleDelete = (banner) => {
    confirmToast(
      `¿Eliminar el banner "${banner.title || 'sin título'}"?`,
      async () => {
        try {
          const response = await apiRequest(`/api/admin/banners/${banner.id}`, {
            method: 'DELETE'
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            toast.error(data.error || 'No se pudo eliminar');
            return;
          }
          toast.success('Banner eliminado');
          await loadBanners();
        } catch (error) {
          console.error('Error deleting banner:', error);
          toast.error('Error al eliminar banner');
        }
      }
    );
  };

  const handleToggleActive = async (banner) => {
    try {
      const response = await apiRequest(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !banner.is_active })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'No se pudo actualizar el estado');
        return;
      }
      toast.success(!banner.is_active ? 'Banner activado' : 'Banner desactivado');
      await loadBanners();
    } catch (error) {
      console.error('Error toggling banner status:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const handleImageUpload = async (file, fieldName = 'image_url') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'banners');

      const response = await apiRequest('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo subir imagen');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, [fieldName]: data.url || '' }));
      toast.success('Imagen subida');
    } catch (error) {
      console.error('Error uploading banner image:', error);
      toast.error(error.message || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image_url?.trim()) {
      toast.error('La imagen principal es obligatoria');
      return;
    }

    const payload = {
      ...formData,
      sort_order: Number(formData.sort_order) || 0,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null
    };

    try {
      setSaving(true);
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = editingBanner ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'No se pudo guardar el banner');
        return;
      }

      toast.success(editingBanner ? 'Banner actualizado' : 'Banner creado');
      closeModal();
      await loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Error al guardar banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Gestión de Banners">
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Banners de Home</h2>
            <p className={styles.subtitle}>
              Gestiona el carrusel principal y su orden de aparición.
            </p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={openCreateModal}>
            + Nuevo banner
          </button>
        </div>

        {loading ? (
          <div className={styles.stateBox}>Cargando banners...</div>
        ) : sortedBanners.length === 0 ? (
          <div className={styles.stateBox}>No hay banners todavía. Crea el primero para el home.</div>
        ) : (
          <div className={styles.grid}>
            {sortedBanners.map((banner) => (
              <article key={banner.id} className={styles.card}>
                <div className={styles.cardImageWrap}>
                  {banner.image_url ? (
                    <Image
                      src={banner.image_url}
                      alt={banner.title || 'Banner'}
                      width={560}
                      height={280}
                      className={styles.cardImage}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>Sin imagen</div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.cardTitle}>{banner.title || 'Sin título'}</h3>
                    <span className={`${styles.badge} ${banner.is_active ? styles.active : styles.inactive}`}>
                      {banner.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className={styles.cardText}>{banner.subtitle || 'Sin subtítulo'}</p>
                  <div className={styles.metaRow}>
                    <span>Orden: {Number(banner.sort_order || 0)}</span>
                    <span>{banner.cta_label ? `CTA: ${banner.cta_label}` : 'Sin CTA'}</span>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondaryButton} onClick={() => openEditModal(banner)}>
                      Editar
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={() => handleToggleActive(banner)}>
                      {banner.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button type="button" className={styles.dangerButton} onClick={() => handleDelete(banner)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{editingBanner ? 'Editar banner' : 'Crear banner'}</h3>
                <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="Cerrar modal">
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className={styles.form}>
                <label className={styles.formGroup}>
                  <span>Título</span>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className={styles.input}
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>Subtítulo</span>
                  <textarea
                    value={formData.subtitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                    className={styles.textarea}
                    rows={3}
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>URL imagen desktop *</span>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </label>

                <label className={styles.uploadGroup}>
                  <span>Subir imagen desktop</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], 'image_url')}
                    disabled={uploading}
                    className={styles.fileInput}
                  />
                </label>

                <label className={styles.formGroup}>
                  <span>URL imagen mobile</span>
                  <input
                    type="url"
                    value={formData.mobile_image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mobile_image_url: e.target.value }))}
                    className={styles.input}
                  />
                </label>

                <label className={styles.uploadGroup}>
                  <span>Subir imagen mobile</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files?.[0], 'mobile_image_url')}
                    disabled={uploading}
                    className={styles.fileInput}
                  />
                </label>

                <div className={styles.row2}>
                  <label className={styles.formGroup}>
                    <span>Texto CTA</span>
                    <input
                      type="text"
                      value={formData.cta_label}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cta_label: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.formGroup}>
                    <span>URL CTA</span>
                    <input
                      type="text"
                      value={formData.cta_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cta_url: e.target.value }))}
                      className={styles.input}
                      placeholder="/catalog"
                    />
                  </label>
                </div>

                <div className={styles.row2}>
                  <label className={styles.formGroup}>
                    <span>Orden</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.sort_order}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span>Activo</span>
                  </label>
                </div>

                <div className={styles.row2}>
                  <label className={styles.formGroup}>
                    <span>Inicia (opcional)</span>
                    <input
                      type="datetime-local"
                      value={formData.starts_at}
                      onChange={(e) => setFormData((prev) => ({ ...prev, starts_at: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                  <label className={styles.formGroup}>
                    <span>Termina (opcional)</span>
                    <input
                      type="datetime-local"
                      value={formData.ends_at}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ends_at: e.target.value }))}
                      className={styles.input}
                    />
                  </label>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeModal} disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.primaryButton} disabled={saving || uploading}>
                    {saving ? 'Guardando...' : editingBanner ? 'Guardar cambios' : 'Crear banner'}
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

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
