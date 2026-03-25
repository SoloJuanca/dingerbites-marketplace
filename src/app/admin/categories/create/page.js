'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from '../categories.module.css';

export default function CreateCategoryPage() {
  const { apiRequest } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true,
    parent_id: '',
    tcg_category_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [tcgApiCategories, setTcgApiCategories] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await apiRequest('/api/admin/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };
    loadCategories();
  }, [apiRequest]);

  const selectedParent = categories.find((c) => c.id === formData.parent_id);
  const isTcgParent = selectedParent?.slug === 'tcg';

  useEffect(() => {
    if (isTcgParent) {
      fetch('/api/tcg/categories')
        .then((r) => r.json())
        .then((d) => setTcgApiCategories(d.results || []))
        .catch(() => setTcgApiCategories([]));
    } else {
      setTcgApiCategories([]);
    }
  }, [isTcgParent]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      setLoading(true);
      const slug = formData.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      const categoryData = {
        ...formData,
        slug
      };

      const response = await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        toast.success('Categoría creada exitosamente');
        router.push('/admin/categories');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al crear la categoría');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Error al crear la categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategoryImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    try {
      setUploadingImage(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'categories');

      const response = await apiRequest('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo subir la imagen');
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, image_url: data.url || '' }));
      toast.success('Imagen subida y guardada en almacenamiento');
    } catch (error) {
      console.error('Error uploading category image:', error);
      toast.error(error.message || 'Error al subir imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <AdminLayout title="Crear Categoría">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/categories" className={styles.backButton}>
              ← Volver a Categorías
            </Link>
            <h2 className={styles.pageTitle}>Crear Nueva Categoría</h2>
          </div>
        </div>

        {/* Form */}
        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="Nombre de la categoría"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descripción</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={styles.formTextarea}
                placeholder="Descripción de la categoría"
                rows="4"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Categoría padre</label>
              <select
                name="parent_id"
                value={formData.parent_id}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value, tcg_category_id: '' }))}
                className={styles.formSelect}
              >
                <option value="">Ninguna (categoría principal)</option>
                {categories
                  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? `  ↳ ${c.name}` : c.name}
                    </option>
                  ))}
              </select>
            </div>

            {isTcgParent && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Categoría TCG (API)</label>
                <select
                  name="tcg_category_id"
                  value={formData.tcg_category_id}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                >
                  <option value="">Ninguna</option>
                  {tcgApiCategories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.displayName || c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.formGroup}>
              <span className={styles.formLabel}>Imagen</span>
              <p className={styles.imageFieldDescription}>
                Sube un archivo (se guarda en el servidor) o pega una URL externa opcional.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={styles.fileInput}
                disabled={uploadingImage}
                aria-label="Subir imagen de categoría desde archivo"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCategoryImageUpload(file);
                  e.target.value = '';
                }}
              />
              {uploadingImage && (
                <p className={styles.uploadStatus} role="status">
                  Subiendo imagen…
                </p>
              )}
              <label className={`${styles.formLabel} ${styles.imageUrlOptional}`} htmlFor="category-image-url">
                URL de imagen (opcional)
              </label>
              <input
                id="category-image-url"
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              {formData.image_url && (
                <div className={styles.imagePreview}>
                  <img
                    src={formData.image_url}
                    alt="Vista previa"
                    className={styles.previewImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className={styles.checkbox}
                />
                Categoría activa
              </label>
            </div>

            <div className={styles.formActions}>
              <Link href="/admin/categories" className={styles.cancelButton}>
                Cancelar
              </Link>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={loading || uploadingImage}
              >
                {loading ? 'Creando...' : 'Crear Categoría'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
