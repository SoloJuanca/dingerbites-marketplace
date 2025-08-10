'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import { confirmToast } from '../../../lib/toastHelpers';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './categories.module.css';

export default function CategoriesPage() {
  const { apiRequest } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/categories');
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        toast.error('Error al cargar las categorías');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
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

      const categoryData = {
        ...formData,
        slug
      };

      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(categoryData)
      });

      if (response.ok) {
        toast.success(editingCategory ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente');
        loadCategories();
        closeModal();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al guardar la categoría');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Error al guardar la categoría');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || '',
      is_active: category.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId, categoryName) => {
    confirmToast(
      `¿Estás seguro de que quieres eliminar "${categoryName}"?`,
      async () => {
        try {
          const response = await apiRequest(`/api/admin/categories/${categoryId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            toast.success('Categoría eliminada exitosamente');
            loadCategories();
          } else {
            const errorData = await response.json();
            toast.error(errorData.error || 'Error al eliminar la categoría');
          }
        } catch (error) {
          console.error('Error deleting category:', error);
          toast.error('Error al eliminar la categoría');
        }
      }
    );
  };

  const openModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      is_active: true
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      is_active: true
    });
  };

  return (
    <AdminLayout title="Gestión de Categorías">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.pageTitle}>Categorías</h2>
            <span className={styles.categoryCount}>
              {categories.length} categorías en total
            </span>
          </div>
          <div className={styles.headerRight}>
            <button onClick={openModal} className={styles.createButton}>
              ➕ Agregar Categoría
            </button>
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando categorías...</p>
          </div>
        ) : (
          <div className={styles.gridContainer}>
            {categories.map(category => (
              <div key={category.id} className={styles.categoryCard}>
                <div className={styles.cardImage}>
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      width={120}
                      height={120}
                      className={styles.image}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>🏷️</div>
                  )}
                </div>
                
                <div className={styles.cardContent}>
                  <h3 className={styles.categoryName}>{category.name}</h3>
                  <p className={styles.categoryDescription}>
                    {category.description || 'Sin descripción'}
                  </p>
                  <div className={styles.categoryMeta}>
                    <span className={styles.categorySlug}>/{category.slug}</span>
                    <span className={`${styles.statusBadge} ${
                      category.is_active ? styles.active : styles.inactive
                    }`}>
                      {category.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  <button
                    onClick={() => handleEdit(category)}
                    className={styles.editButton}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className={styles.deleteButton}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}

            {categories.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏷️</div>
                <h3>No hay categorías</h3>
                <p>Comienza agregando tu primera categoría.</p>
                <button onClick={openModal} className={styles.createButton}>
                  Agregar Categoría
                </button>
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
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
                    placeholder="Nombre de la categoría"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={styles.formTextarea}
                    placeholder="Descripción de la categoría"
                    rows="3"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>URL de Imagen</label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className={styles.formInput}
                    placeholder="https://ejemplo.com/imagen.jpg"
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
                    Categoría activa
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
                    {editingCategory ? 'Actualizar' : 'Crear'} Categoría
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
