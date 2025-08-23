'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from '../categories.module.css';

export default function CreateCategoryPage() {
  const { apiRequest } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

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
              <label className={styles.formLabel}>URL de Imagen</label>
              <input
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
                disabled={loading}
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
