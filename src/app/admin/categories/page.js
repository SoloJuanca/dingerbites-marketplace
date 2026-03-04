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
    is_active: true,
    parent_id: '',
    tcg_category_id: ''
  });
  const [tcgApiCategories, setTcgApiCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, []);

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

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/admin/categories');
      
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
        slug,
        parent_id: formData.parent_id || null,
        tcg_category_id: formData.tcg_category_id || null
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
      is_active: category.is_active,
      parent_id: category.parent_id || '',
      tcg_category_id: category.tcg_category_id ?? ''
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
      is_active: true,
      parent_id: '',
      tcg_category_id: ''
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
      is_active: true,
      parent_id: '',
      tcg_category_id: ''
    });
  };

  /** Build tree: [{category, children: [...]}] */
  const buildCategoryTree = (items, parentId = null) => {
    return items
      .filter((c) => (c.parent_id || null) === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((cat) => ({
        ...cat,
        children: buildCategoryTree(items, cat.id)
      }));
  };

  const categoryTree = buildCategoryTree(categories);

  /** Get options for parent selector (exclude self and descendants when editing) */
  const getParentOptions = () => {
    const excludeIds = new Set();
    if (editingCategory) {
      excludeIds.add(editingCategory.id);
      const collectDescendants = (id) => {
        categories.filter((c) => c.parent_id === id).forEach((c) => {
          excludeIds.add(c.id);
          collectDescendants(c.id);
        });
      };
      collectDescendants(editingCategory.id);
    }
    return categories
      .filter((c) => !excludeIds.has(c.id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const renderCategoryTree = (nodes, depth = 0) => (
    <>
      {nodes.map((cat) => (
        <div key={cat.id} className={styles.categoryRow} style={{ paddingLeft: depth * 24 }}>
          <div className={styles.categoryCard}>
            <div className={styles.cardImage}>
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  width={120}
                  height={120}
                  className={styles.image}
                />
              ) : (
                <div className={styles.imagePlaceholder}>🏷️</div>
              )}
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.categoryName}>
                {depth > 0 && <span className={styles.subcategoryIndicator}>↳ </span>}
                {cat.name}
              </h3>
              <p className={styles.categoryDescription}>
                {cat.description || 'Sin descripción'}
              </p>
              <div className={styles.categoryMeta}>
                <span className={styles.categorySlug}>/{cat.slug}</span>
                <span className={`${styles.statusBadge} ${cat.is_active ? styles.active : styles.inactive}`}>
                  {cat.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
            <div className={styles.cardActions}>
              <button onClick={() => handleEdit(cat)} className={styles.editButton}>✏️ Editar</button>
              <button onClick={() => handleDelete(cat.id, cat.name)} className={styles.deleteButton}>🗑️ Eliminar</button>
            </div>
          </div>
          {cat.children?.length > 0 && renderCategoryTree(cat.children, depth + 1)}
        </div>
      ))}
    </>
  );

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
            <Link href="/admin/categories/create" className={styles.createButton}>
              ➕ Agregar Categoría
            </Link>
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
            {categoryTree.length > 0 && renderCategoryTree(categoryTree)}

            {categories.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🏷️</div>
                <h3>No hay categorías</h3>
                <p>Comienza agregando tu primera categoría.</p>
                <Link href="/admin/categories/create" className={styles.createButton}>
                  Agregar Categoría
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
                  <label className={styles.formLabel}>Categoría padre</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value, tcg_category_id: '' }))}
                    className={styles.formSelect}
                  >
                    <option value="">Ninguna (categoría principal)</option>
                    {getParentOptions().map((c) => (
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
                      value={formData.tcg_category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tcg_category_id: e.target.value }))}
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
