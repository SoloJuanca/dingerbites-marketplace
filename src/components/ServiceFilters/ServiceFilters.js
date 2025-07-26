'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getServiceCategories, getServiceLevels, getServicePriceRange } from '../../lib/services';
import styles from './ServiceFilters.module.css';

export default function ServiceFilters({ 
  currentCategory, 
  currentLevel, 
  currentMinPrice, 
  currentMaxPrice 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories] = useState(getServiceCategories());
  const [levels] = useState(getServiceLevels());
  const [priceRange] = useState(getServicePriceRange());
  const [minPrice, setMinPrice] = useState(currentMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || '');

  const updateFilters = (newFilters) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/services?${params.toString()}`);
  };

  const handleCategoryChange = (category) => {
    updateFilters({ 
      category: category === currentCategory ? '' : category,
      level: currentLevel,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handleLevelChange = (e) => {
    updateFilters({
      category: currentCategory,
      level: e.target.value,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handlePriceSubmit = (e) => {
    e.preventDefault();
    updateFilters({
      category: currentCategory,
      level: currentLevel,
      minPrice: minPrice,
      maxPrice: maxPrice
    });
  };

  const clearAllFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    router.push('/services');
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

      {/* Nivel */}
      <div className={styles.filterSection}>
        <h4 className={styles.sectionTitle}>Nivel</h4>
        <select 
          value={currentLevel || ''} 
          onChange={handleLevelChange}
          className={styles.levelSelect}
        >
          <option value="">Todos los niveles</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {level}
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
              placeholder={`Min $${Math.floor(priceRange.min)}`}
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
              placeholder={`Max $${Math.floor(priceRange.max)}`}
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