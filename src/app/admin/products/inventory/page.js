'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from './inventory.module.css';

export default function InventoryPage() {
  const { apiRequest, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryStats, setInventoryStats] = useState({
    totalInvestment: 0,
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    subcategory: '',
    tcgCategoryId: '',
    tcgGroupId: '',
    manufacturerBrand: '',
    franchiseBrand: '',
    stockStatus: 'all',
    orderBy: 'date_desc'
  });
  const [categories, setCategories] = useState([]);
  const [manufacturerBrands, setManufacturerBrands] = useState([]);
  const [franchiseBrands, setFranchiseBrands] = useState([]);
  const [tcgApiCategories, setTcgApiCategories] = useState([]);
  const [tcgApiGroups, setTcgApiGroups] = useState([]);
  const [loadingTcgCategories, setLoadingTcgCategories] = useState(false);
  const [loadingTcgGroups, setLoadingTcgGroups] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Local state for stock inputs
  const [localStockValues, setLocalStockValues] = useState({});
  const [updatingStock, setUpdatingStock] = useState(new Set());
  
  // Refs for debouncing
  const stockUpdateTimeouts = useRef({});

  useEffect(() => {
    if (isAuthenticated) {
      loadInventoryData();
      loadFiltersData();
    }
  }, [filters, pagination.page, isAuthenticated]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await apiRequest(`/api/admin/inventory?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setInventoryStats(data.stats || inventoryStats);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
        
        // Initialize local stock values with server data as strings
        const stockValues = {};
        (data.products || []).forEach(product => {
          stockValues[product.id] = product.stock_quantity.toString();
        });
        setLocalStockValues(stockValues);
      } else {
        toast.error('Error al cargar el inventario');
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const loadFiltersData = async () => {
    try {
      const [categoriesResponse, manufacturerBrandsResponse, franchiseBrandsResponse] = await Promise.all([
        apiRequest('/api/admin/categories'),
        apiRequest('/api/admin/brands?type=manufacturer'),
        apiRequest('/api/admin/brands?type=franchise')
      ]);

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      }

      if (manufacturerBrandsResponse.ok) {
        const manufacturerBrandsData = await manufacturerBrandsResponse.json();
        setManufacturerBrands(manufacturerBrandsData.brands || []);
      }

      if (franchiseBrandsResponse.ok) {
        const franchiseBrandsData = await franchiseBrandsResponse.json();
        setFranchiseBrands(franchiseBrandsData.brands || []);
      }
    } catch (error) {
      console.error('Error loading filters data:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      if (key === 'category') {
        return {
          ...prev,
          category: value,
          subcategory: '',
          tcgCategoryId: '',
          tcgGroupId: ''
        };
      }
      return { ...prev, [key]: value };
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const selectedCategory = categories.find((c) => String(c.id) === String(filters.category));
  const isTcgParent = selectedCategory?.slug === 'tcg';

  useEffect(() => {
    if (!isAuthenticated || !isTcgParent) {
      setTcgApiCategories([]);
      setTcgApiGroups([]);
      return;
    }

    const loadTcgCategories = async () => {
      setLoadingTcgCategories(true);
      try {
        const res = await fetch('/api/tcg/categories', { cache: 'no-store' });
        const data = await res.json();
        setTcgApiCategories(Array.isArray(data?.results) ? data.results : []);
      } catch {
        setTcgApiCategories([]);
      } finally {
        setLoadingTcgCategories(false);
      }
    };

    loadTcgCategories();
  }, [isAuthenticated, isTcgParent]);

  useEffect(() => {
    if (!isAuthenticated || !isTcgParent || !filters.tcgCategoryId) {
      setTcgApiGroups([]);
      return;
    }

    const loadTcgGroups = async () => {
      setLoadingTcgGroups(true);
      try {
        const res = await fetch(`/api/tcg/${filters.tcgCategoryId}/groups`, { cache: 'no-store' });
        const data = await res.json();
        setTcgApiGroups(Array.isArray(data?.results) ? data.results : []);
      } catch {
        setTcgApiGroups([]);
      } finally {
        setLoadingTcgGroups(false);
      }
    };

    loadTcgGroups();
  }, [isAuthenticated, isTcgParent, filters.tcgCategoryId]);

  // Debounced stock update function
  const debouncedUpdateStock = useCallback(async (productId, newStock) => {
    try {
      setUpdatingStock(prev => new Set(prev).add(productId));
      
      const response = await apiRequest(`/api/admin/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stock: newStock })
      });

      if (response.ok) {
        toast.success('Stock actualizado exitosamente');
        // Update the products state directly instead of reloading everything
        setProducts(prev => prev.map(product => 
          product.id === productId 
            ? { ...product, stock_quantity: newStock }
            : product
        ));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al actualizar el stock');
        // Reset local value on error
        const originalStock = products.find(p => p.id === productId)?.stock_quantity || 0;
        setLocalStockValues(prev => ({
          ...prev,
          [productId]: originalStock.toString()
        }));
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Error al actualizar el stock');
      // Reset local value on error
      const originalStock = products.find(p => p.id === productId)?.stock_quantity || 0;
      setLocalStockValues(prev => ({
        ...prev,
        [productId]: originalStock.toString()
      }));
    } finally {
      setUpdatingStock(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  }, [apiRequest, products]);

  // Handle stock input change
  const handleStockChange = (productId, value) => {
    // Update local state immediately for responsive UI - keep the raw value
    setLocalStockValues(prev => ({ ...prev, [productId]: value }));
    
    // Clear existing timeout for this product
    if (stockUpdateTimeouts.current[productId]) {
      clearTimeout(stockUpdateTimeouts.current[productId]);
    }
    
    // Set new timeout for debounced API call
    stockUpdateTimeouts.current[productId] = setTimeout(() => {
      // Only convert to number when actually updating
      const newStock = value === '' ? 0 : (parseInt(value) || 0);
      debouncedUpdateStock(productId, newStock);
      delete stockUpdateTimeouts.current[productId];
    }, 1000); // 1 second delay
  };

  // Handle stock input blur (immediate update)
  const handleStockBlur = (productId) => {
    // Clear timeout and update immediately on blur
    if (stockUpdateTimeouts.current[productId]) {
      clearTimeout(stockUpdateTimeouts.current[productId]);
      delete stockUpdateTimeouts.current[productId];
      
      const currentValue = localStockValues[productId];
      const newStock = currentValue === '' || currentValue === undefined ? 0 : (parseInt(currentValue) || 0);
      debouncedUpdateStock(productId, newStock);
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

  const getMissingFields = (product) => {
    const missing = [];
    if (!product.name?.trim()) missing.push('Nombre');
    if (!product.price || Number(product.price) <= 0) missing.push('Precio');
    if (!product.sku) missing.push('SKU');
    if (!product.category_name) missing.push('Categoría');
    if (!product.image_url) missing.push('Imagen');
    if (!product.description && !product.short_description) missing.push('Descripción');
    return missing;
  };

  const calculateInvestmentValue = (price, cost, stock) => {
    const unitCost = cost || price * 0.6; // Si no hay costo, asumimos 60% del precio
    return unitCost * stock;
  };

  return (
    <AdminLayout title="Inventario">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.pageTitle}>Inventario</h2>
            <span className={styles.subtitle}>
              Gestión y seguimiento de stock
            </span>
          </div>
          <div className={styles.headerRight}>
            <Link href="/admin/products" className={styles.backButton}>
              ← Volver a Productos
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><span className="material-symbols-outlined">payments</span></div>
            <div className={styles.statContent}>
              <h3>Inversión Total en Stock</h3>
              <p className={styles.statValue}>
                {formatPrice(inventoryStats.totalInvestment)}
              </p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}><span className="material-symbols-outlined">inventory_2</span></div>
            <div className={styles.statContent}>
              <h3>Total de Productos</h3>
              <p className={styles.statValue}>
                {inventoryStats.totalProducts}
              </p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}><span className="material-symbols-outlined">warning</span></div>
            <div className={styles.statContent}>
              <h3>Stock Bajo</h3>
              <p className={styles.statValue}>
                {inventoryStats.lowStockItems}
              </p>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}><span className="material-symbols-outlined">block</span></div>
            <div className={styles.statContent}>
              <h3>Sin Stock</h3>
              <p className={styles.statValue}>
                {inventoryStats.outOfStockItems}
              </p>
            </div>
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
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Todas las categorías</option>
              {Array.isArray(categories) && categories.filter((category) => !category.parent_id).map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {isTcgParent ? (
            <>
              <div className={styles.filterGroup}>
                <select
                  value={filters.tcgCategoryId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      tcgCategoryId: e.target.value,
                      tcgGroupId: ''
                    }))
                  }
                  className={styles.filterSelect}
                  disabled={loadingTcgCategories}
                >
                  <option value="">
                    {loadingTcgCategories ? 'Cargando categorías TCG...' : 'Categoría TCG (API)'}
                  </option>
                  {tcgApiCategories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.displayName || c.name} ({c.categoryId})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <select
                  value={filters.tcgGroupId}
                  onChange={(e) => handleFilterChange('tcgGroupId', e.target.value)}
                  className={styles.filterSelect}
                  disabled={!filters.tcgCategoryId || loadingTcgGroups}
                >
                  <option value="">
                    {loadingTcgGroups
                      ? 'Cargando sets...'
                      : !filters.tcgCategoryId
                        ? 'Set / Grupo (elige categoría)'
                        : 'Set / Grupo (API)'}
                  </option>
                  {tcgApiGroups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.name} ({g.groupId})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className={styles.filterGroup}>
              <select
                value={filters.subcategory}
                onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todas las subcategorías</option>
                {Array.isArray(categories) &&
                  categories
                    .filter(
                      (category) =>
                        category.parent_id && (!filters.category || category.parent_id === filters.category)
                    )
                    .map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
              </select>
            </div>
          )}

          <div className={styles.filterGroup}>
            <select
              value={filters.manufacturerBrand}
              onChange={(e) => handleFilterChange('manufacturerBrand', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Todas las marcas fabricante</option>
              {Array.isArray(manufacturerBrands) && manufacturerBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              value={filters.franchiseBrand}
              onChange={(e) => handleFilterChange('franchiseBrand', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Todas las marcas de franquicia</option>
              {Array.isArray(franchiseBrands) && franchiseBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              value={filters.stockStatus}
              onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todos los estados</option>
              <option value="in_stock">En Stock</option>
              <option value="low_stock">Stock Bajo</option>
              <option value="out_of_stock">Sin Stock</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              value={filters.orderBy}
              onChange={(e) => handleFilterChange('orderBy', e.target.value)}
              className={styles.filterSelect}
              aria-label="Ordenar inventario"
            >
              <option value="date_desc">Fecha (recientes primero)</option>
              <option value="date_asc">Fecha (antiguos primero)</option>
              <option value="price_asc">Precio (menor a mayor)</option>
              <option value="price_desc">Precio (mayor a menor)</option>
              <option value="name_asc">A - Z</option>
              <option value="name_desc">Z - A</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando inventario...</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Precio Venta</th>
                  <th>Costo Unitario</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Valor Inventario</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(products) && products.map(product => {
                  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
                  const inventoryValue = calculateInvestmentValue(
                    product.price, 
                    product.cost_price, 
                    product.stock_quantity
                  );
                  const missingFields = getMissingFields(product);
                  const isIncomplete = missingFields.length > 0;
                  
                  return (
                    <tr key={product.id} className={isIncomplete ? styles.incompleteRow : undefined}>
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
                              <div className={styles.imagePlaceholder}><span className="material-symbols-outlined">inventory_2</span></div>
                            )}
                          </div>
                          <div className={styles.productDetails}>
                            <span className={styles.productName}>{product.name}</span>
                            <span className={styles.productSlug}>{product.slug}</span>
                            {isIncomplete && (
                              <span
                                className={styles.incompleteBadge}
                                title={`Falta: ${missingFields.join(', ')}`}
                              >
                                Incompleto
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.sku}>{product.sku || '-'}</span>
                      </td>
                      <td>
                        <span className={styles.price}>
                          {formatPrice(product.price)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.cost}>
                          {formatPrice(product.cost_price || product.price * 0.6)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.stockInput}>
                          <input
                            type="number"
                            min="0"
                            value={localStockValues[product.id] ?? product.stock_quantity.toString()}
                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                            onBlur={() => handleStockBlur(product.id)}
                            className={`${styles.stockField} ${updatingStock.has(product.id) ? styles.updating : ''}`}
                            disabled={updatingStock.has(product.id)}
                          />
                          {updatingStock.has(product.id) && (
                            <div className={styles.stockSpinner}><span className="material-symbols-outlined">hourglass_top</span></div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={styles.threshold}>
                          {product.low_stock_threshold}
                        </span>
                      </td>
                      <td>
                        <span className={styles.inventoryValue}>
                          {formatPrice(inventoryValue)}
                        </span>
                      </td>
                      <td>
                        <span 
                          className={styles.stockStatus}
                          style={{ color: stockStatus.color }}
                        >
                          {stockStatus.label}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Link 
                            href={`/admin/products/${product.id}/edit`}
                            className={styles.editButton}
                            title="Editar producto"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {Array.isArray(products) && products.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><span className="material-symbols-outlined">inventory_2</span></div>
                <h3>No hay productos en inventario</h3>
                <p>Los productos aparecerán aquí cuando tengas stock disponible.</p>
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
