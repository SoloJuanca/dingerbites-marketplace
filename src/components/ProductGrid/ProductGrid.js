'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '../ProductCard/ProductCard';
import Pagination from '../Pagination/Pagination';
import Icon from '../Icon/Icon';
import styles from './ProductGrid.module.css';

export default function ProductGrid({
  currentPage,
  category,
  subcategory,
  manufacturerBrand,
  franchiseBrand,
  brand,
  condition,
  minPrice,
  maxPrice,
  sortBy,
  search,
  initialData = null
}) {
  const [products, setProducts] = useState(initialData?.products || []);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 0);
  const [hasNextPage, setHasNextPage] = useState(initialData?.hasNextPage || false);
  const [hasPrevPage, setHasPrevPage] = useState(initialData?.hasPrevPage || false);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage,
          limit: 12
        });

        if (category) params.set('category', category);
        if (subcategory) params.set('subcategory', subcategory);
        if (manufacturerBrand) params.set('manufacturerBrand', manufacturerBrand);
        if (franchiseBrand) params.set('franchiseBrand', franchiseBrand);
        if (brand) params.set('brand', brand);
        if (condition) params.set('condition', condition);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (sortBy) params.set('sortBy', sortBy);
        if (search) params.set('q', search);

        const response = await fetch(`/api/search/products?${params.toString()}`);
        
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

    if (initialData) {
      setProducts(initialData.products || []);
      setTotal(initialData.total || 0);
      setTotalPages(initialData.totalPages || 0);
      setHasNextPage(initialData.hasNextPage || false);
      setHasPrevPage(initialData.hasPrevPage || false);
      setLoading(false);
      return;
    }

    loadProducts();
  }, [currentPage, category, subcategory, manufacturerBrand, franchiseBrand, brand, condition, minPrice, maxPrice, sortBy, search, initialData]);

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
        <h3 className={styles.emptyTitle}>Espera pronto nuevos productos.</h3>
        <p className={styles.emptyMessage}>
          ¡En breve estarán disponibles nuevos productos para tu colección!
        </p>
        <div className={styles.emptyCta}>
          <p className={styles.emptyCtaText}>
            ¿No encuentras lo que buscabas? ¡Haznos saber qué buscas para poder conseguirlo!
          </p>
          <Link href="/contact" className={styles.emptyCtaButton}>
            <Icon name="chat" size={20} />
            Contáctanos
          </Link>
        </div>
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