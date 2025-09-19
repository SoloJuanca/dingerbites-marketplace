'use client';

import { useState, useEffect } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import Pagination from '../Pagination/Pagination';
import Icon from '../Icon/Icon';
import styles from './ProductGrid.module.css';

export default function ProductGrid({
  currentPage,
  category,
  brand,
  minPrice,
  maxPrice,
  sortBy,
  search
}) {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage,
          limit: 12
        });

        if (category) params.set('category', category);
        if (brand) params.set('brand', brand);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (sortBy) params.set('sortBy', sortBy);
        if (search) params.set('search', search);

        const response = await fetch(`/api/products?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
        setHasNextPage(data.hasNextPage || false);
        setHasPrevPage(data.hasPrevPage || false);
      } catch (error) {
        console.error('Error loading products:', error);
        // Reset to empty state on error
        setProducts([]);
        setTotal(0);
        setTotalPages(0);
        setHasNextPage(false);
        setHasPrevPage(false);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [currentPage, category, brand, minPrice, maxPrice, sortBy, search]);

  if (loading) {
    return (
      <div className={styles.gridContainer}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Icon name="autorenew" size={32} className={styles.loadingIcon} />
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Icon name="search_off" size={64} className={styles.searchIcon} />
        </div>
        <h3 className={styles.emptyTitle}>No se encontraron productos</h3>
        <p className={styles.emptyMessage}>
          Intenta ajustar los filtros para ver más resultados
        </p>
      </div>
    );
  }

  return (
    <div className={styles.gridContainer}>
      <div className={styles.resultsHeader}>
        <p className={styles.resultsCount}>
          Mostrando {products.length} de {total} productos
        </p>
      </div>

      <div className={styles.productGrid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
        />
      )}
    </div>
  );
} 