'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from '../brands.module.css';

export default function CreateBrandPage() {
  const { apiRequest } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    website_url: '',
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

      const brandData = {
        ...formData,
        slug
      };

      const response = await apiRequest('/api/admin/brands', {
        method: 'POST',
        body: JSON.stringify(brandData)
      });

      if (response.ok) {
        toast.success('Marca creada exitosamente');
        router.push('/admin/brands');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al crear la marca');
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      toast.error('Error al crear la marca');
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
    <AdminLayout title="Crear Marca">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/admin/brands" className={styles.backButton}>
              ← Volver a Marcas
            </Link>
            <h2 className={styles.pageTitle}>Crear Nueva Marca</h2>
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
                placeholder="Nombre de la marca"
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
                placeholder="Descripción de la marca"
                rows="4"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>URL del Logo</label>
              <input
                type="url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="https://ejemplo.com/logo.jpg"
              />
              {formData.logo_url && (
                <div className={styles.imagePreview}>
                  <img 
                    src={formData.logo_url} 
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
              <label className={styles.formLabel}>Sitio Web</label>
              <input
                type="url"
                name="website_url"
                value={formData.website_url}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="https://ejemplo.com"
              />
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
                Marca activa
              </label>
            </div>

            <div className={styles.formActions}>
              <Link href="/admin/brands" className={styles.cancelButton}>
                Cancelar
              </Link>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear Marca'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
