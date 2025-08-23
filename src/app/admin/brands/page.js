'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import { confirmToast } from '../../../lib/toastHelpers';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './brands.module.css';

export default function BrandsPage() {
  const { apiRequest } = useAuth();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    website_url: '',
    is_active: true
  });

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/brands');
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
      } else {
        toast.error('Error al cargar las marcas');
      }
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      const slug = formData.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();

      const brandData = {
        ...formData,
        slug
      };

      const url = editingBrand 
        ? `/api/admin/brands/${editingBrand.id}`
        : '/api/admin/brands';
      
      const method = editingBrand ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(brandData)
      });

      if (response.ok) {
        toast.success(editingBrand ? 'Marca actualizada exitosamente' : 'Marca creada exitosamente');
        loadBrands();
        closeModal();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al guardar la marca');
      }
    } catch (error) {
      console.error('Error saving brand:', error);
      toast.error('Error al guardar la marca');
    }
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      website_url: brand.website_url || '',
      is_active: brand.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (brandId, brandName) => {
    confirmToast(
      `¿Estás seguro de que quieres eliminar "${brandName}"?`,
      async () => {
        try {
          const response = await apiRequest(`/api/admin/brands/${brandId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            toast.success('Marca eliminada exitosamente');
            loadBrands();
          } else {
            const errorData = await response.json();
            toast.error(errorData.error || 'Error al eliminar la marca');
          }
        } catch (error) {
          console.error('Error deleting brand:', error);
          toast.error('Error al eliminar la marca');
        }
      }
    );
  };

  const openModal = () => {
    setEditingBrand(null);
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      website_url: '',
      is_active: true
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      website_url: '',
      is_active: true
    });
  };

  return (
    <AdminLayout title="Gestión de Marcas">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.pageTitle}>Marcas</h2>
            <span className={styles.brandCount}>
              {brands.length} marcas en total
            </span>
          </div>
          <div className={styles.headerRight}>
            <Link href="/admin/brands/create" className={styles.createButton}>
              ➕ Agregar Marca
            </Link>
          </div>
        </div>

        {/* Brands Grid */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando marcas...</p>
          </div>
        ) : (
          <div className={styles.gridContainer}>
            {brands.map(brand => (
              <div key={brand.id} className={styles.brandCard}>
                <div className={styles.cardImage}>
                  {brand.logo_url ? (
                    <Image
                      src={brand.logo_url}
                      alt={brand.name}
                      width={120}
                      height={120}
                      className={styles.image}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>🏢</div>
                  )}
                </div>
                
                <div className={styles.cardContent}>
                  <h3 className={styles.brandName}>{brand.name}</h3>
                  <p className={styles.brandDescription}>
                    {brand.description || 'Sin descripción'}
                  </p>
                  <div className={styles.brandMeta}>
                    <span className={styles.brandSlug}>/{brand.slug}</span>
                    {brand.website_url && (
                      <a 
                        href={brand.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.websiteLink}
                      >
                        🌐 Sitio Web
                      </a>
                    )}
                    <span className={`${styles.statusBadge} ${
                      brand.is_active ? styles.active : styles.inactive
                    }`}>
                      {brand.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  <button
                    onClick={() => handleEdit(brand)}
                    className={styles.editButton}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(brand.id, brand.name)}
                    className={styles.deleteButton}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}

            {brands.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏢</div>
                <h3>No hay marcas</h3>
                <p>Comienza agregando tu primera marca.</p>
                <Link href="/admin/brands/create" className={styles.createButton}>
                  Agregar Marca
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {editingBrand ? 'Editar Marca' : 'Nueva Marca'}
                </h3>
                <button onClick={closeModal} className={styles.closeButton}>✕</button>
              </div>
              
              <form onSubmit={handleSubmit} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={styles.formInput}
                    placeholder="Nombre de la marca"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={styles.formTextarea}
                    placeholder="Descripción de la marca"
                    rows="3"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>URL del Logo</label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                    className={styles.formInput}
                    placeholder="https://ejemplo.com/logo.jpg"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Sitio Web</label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                    className={styles.formInput}
                    placeholder="https://ejemplo.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className={styles.checkbox}
                    />
                    Marca activa
                  </label>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={closeModal}
                    className={styles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.saveButton}
                  >
                    {editingBrand ? 'Actualizar' : 'Crear'} Marca
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
