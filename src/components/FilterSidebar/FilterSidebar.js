'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getCategories, getBrands, getPriceRange } from '../../lib/products';
import styles from './FilterSidebar.module.css';

export default function FilterSidebar({ 
  currentCategory, 
  currentBrand, 
  currentMinPrice, 
  currentMaxPrice 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories] = useState(getCategories());
  const [brands] = useState(getBrands());
  const [priceRange] = useState(getPriceRange());
  const [minPrice, setMinPrice] = useState(currentMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || '');

  const updateFilters = (newFilters) => {
    const params = new URLSearchParams(searchParams);
    
    // Resetear página cuando se cambian filtros
    params.delete('page');
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/catalog?${params.toString()}`);
  };

  const handleCategoryChange = (category) => {
    updateFilters({ 
      category: category === currentCategory ? '' : category,
      brand: currentBrand,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handleBrandChange = (e) => {
    updateFilters({
      category: currentCategory,
      brand: e.target.value,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handlePriceSubmit = (e) => {
    e.preventDefault();
    updateFilters({
      category: currentCategory,
      brand: currentBrand,
      minPrice: minPrice,
      maxPrice: maxPrice
    });
  };

  const clearAllFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    router.push('/catalog');
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.filterHeader}>
        <h3 className={styles.title}>Filtros</h3>
        <button onClick={clearAllFilters} className={styles.clearBtn}>
          Limpiar todo
        </button>
      </div>

      {/* Categorías */}
      <div className={styles.filterSection}>
        <h4 className={styles.sectionTitle}>Categorías</h4>
        <div className={styles.categoryList}>
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => handleCategoryChange(category.value)}
              className={`${styles.categoryBtn} ${
                currentCategory === category.value ? styles.active : ''
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Marcas */}
      <div className={styles.filterSection}>
        <h4 className={styles.sectionTitle}>Marca</h4>
        <select 
          value={currentBrand || ''} 
          onChange={handleBrandChange}
          className={styles.brandSelect}
        >
          <option value="">Todas las marcas</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      {/* Rango de precios */}
      <div className={styles.filterSection}>
        <h4 className={styles.sectionTitle}>Rango de precios</h4>
        <form onSubmit={handlePriceSubmit} className={styles.priceForm}>
          <div className={styles.priceInputs}>
            <input
              type="number"
              placeholder={`Min $${priceRange.min}`}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className={styles.priceInput}
              min={priceRange.min}
              max={priceRange.max}
              step="0.01"
            />
            <span className={styles.priceSeparator}>-</span>
            <input
              type="number"
              placeholder={`Max $${priceRange.max}`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className={styles.priceInput}
              min={priceRange.min}
              max={priceRange.max}
              step="0.01"
            />
          </div>
          <button type="submit" className={styles.priceBtn}>
            Aplicar
          </button>
        </form>
      </div>
    </div>
  );
} 