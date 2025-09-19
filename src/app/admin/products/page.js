'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import { confirmToast } from '../../../lib/toastHelpers';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './products.module.css';

export default function ProductsPage() {
  const { apiRequest, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: '',
    status: 'all'
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
      loadFiltersData();
    }
  }, [filters, pagination.page, isAuthenticated]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await apiRequest(`/api/admin/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products.rows || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        toast.error('Error al cargar los productos');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const loadFiltersData = async () => {
    try {
      const [categoriesResponse, brandsResponse] = await Promise.all([
        apiRequest('/api/admin/categories'),
        apiRequest('/api/admin/brands')
      ]);

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        console.log('Categories response:', categoriesData);
        setCategories(categoriesData.categories || []);
      } else {
        console.error('Categories API error:', categoriesResponse.status, categoriesResponse.statusText);
      }

      if (brandsResponse.ok) {
        const brandsData = await brandsResponse.json();
        console.log('Brands response:', brandsData);
        setBrands(brandsData.brands || []);
      } else {
        console.error('Brands API error:', brandsResponse.status, brandsResponse.statusText);
      }
    } catch (error) {
      console.error('Error loading filters data:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (productId, productName) => {
    confirmToast(
      `¿Estás seguro de que quieres eliminar "${productName}"?`,
      async () => {
        try {
          const response = await apiRequest(`/api/admin/products/${productId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            toast.success('Producto eliminado exitosamente');
            loadProducts();
          } else {
            const errorData = await response.json();
            toast.error(errorData.error || 'Error al eliminar el producto');
          }
        } catch (error) {
          console.error('Error deleting product:', error);
          toast.error('Error al eliminar el producto');
        }
      }
    );
  };

  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      const response = await apiRequest(`/api/admin/products/${productId}/toggle-status`, {
        method: 'PATCH'
      });

      if (response.ok) {
        toast.success(`Producto ${currentStatus ? 'desactivado' : 'activado'} exitosamente`);
        loadProducts();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al cambiar el estado del producto');
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error('Error al cambiar el estado del producto');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price || 0);
  };

  const getStockStatus = (stock, threshold) => {
    if (stock === 0) return { status: 'out', label: 'Sin Stock', color: '#ef4444' };
    if (stock <= threshold) return { status: 'low', label: 'Stock Bajo', color: '#f59e0b' };
    return { status: 'good', label: 'En Stock', color: '#10b981' };
  };

  return (
    <AdminLayout title="Gestión de Productos">
      <div className={styles.container}>
        {/* Header Actions */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.pageTitle}>Productos</h2>
            <span className={styles.productCount}>
              {pagination.total} productos en total
            </span>
          </div>
          <div className={styles.headerRight}>
            <Link href="/admin/products/create" className={styles.createButton}>
              ➕ Agregar Producto
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
          {console.log('Categories:', categories)}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Todas las categorías</option>
              {Array.isArray(categories.rows) && categories.rows.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Todas las marcas</option>
              {Array.isArray(brands.rows) && brands.rows.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando productos...</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(products) && products.map(product => {
                  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
                  
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className={styles.productInfo}>
                          <div className={styles.productImage}>
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                width={40}
                                height={40}
                                className={styles.image}
                              />
                            ) : (
                              <div className={styles.imagePlaceholder}>📦</div>
                            )}
                          </div>
                          <div className={styles.productDetails}>
                            <span className={styles.productName}>{product.name}</span>
                            <span className={styles.productSlug}>{product.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.sku}>{product.sku || '-'}</span>
                      </td>
                      <td>
                        <span className={styles.category}>
                          {product.category_name || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.brand}>
                          {product.brand_name || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.price}>
                          {formatPrice(product.price)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.stockInfo}>
                          <span className={styles.stockQuantity}>
                            {product.stock_quantity}
                          </span>
                          <span 
                            className={styles.stockStatus}
                            style={{ color: stockStatus.color }}
                          >
                            {stockStatus.label}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => toggleProductStatus(product.id, product.is_active)}
                          className={`${styles.statusToggle} ${
                            product.is_active ? styles.active : styles.inactive
                          }`}
                        >
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Link 
                            href={`/admin/products/${product.id}/edit`}
                            className={styles.editButton}
                          >
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className={styles.deleteButton}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {Array.isArray(products) && products.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <h3>No hay productos</h3>
                <p>Comienza agregando tu primer producto.</p>
                <Link href="/admin/products/create" className={styles.createButton}>
                  Agregar Producto
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className={styles.paginationButton}
            >
              ← Anterior
            </button>
            
            <span className={styles.paginationInfo}>
              Página {pagination.page} de {pagination.totalPages}
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className={styles.paginationButton}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
