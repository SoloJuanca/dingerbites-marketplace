'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getServiceCategories, getServiceLevels, getServicePriceRange } from '../../lib/services';
import Icon from '../Icon/Icon';
import styles from './ServiceFiltersModal.module.css';

export default function ServiceFiltersModal({ 
  isOpen,
  onClose,
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
  
  // Estados para secciones colapsables
  const [collapsedSections, setCollapsedSections] = useState({
    categories: false,
    levels: false,
    price: false
  });

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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

  const handleLevelChange = (level) => {
    updateFilters({
      category: currentCategory,
      level: level === currentLevel ? '' : level,
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
    onClose();
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const applyFiltersAndClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Filtros</h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Categorías */}
          <div className={styles.filterSection}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection('categories')}
            >
              <h4 className={styles.sectionTitle}>Categorías</h4>
              <Icon 
                name="keyboard_arrow_down" 
                size={20}
                className={`${styles.collapseIcon} ${!collapsedSections.categories ? styles.expanded : ''}`}
              />
            </button>
            <div className={`${styles.sectionContent} ${collapsedSections.categories ? styles.collapsed : ''}`}>
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
          </div>

          {/* Niveles */}
          <div className={styles.filterSection}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection('levels')}
            >
              <h4 className={styles.sectionTitle}>Nivel</h4>
              <Icon 
                name="keyboard_arrow_down" 
                size={20}
                className={`${styles.collapseIcon} ${!collapsedSections.levels ? styles.expanded : ''}`}
              />
            </button>
            <div className={`${styles.sectionContent} ${collapsedSections.levels ? styles.collapsed : ''}`}>
              <div className={styles.levelList}>
                {levels.map((level) => (
                  <button
                    key={level}
                    onClick={() => handleLevelChange(level)}
                    className={`${styles.levelBtn} ${
                      currentLevel === level ? styles.active : ''
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rango de precios */}
          <div className={styles.filterSection}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection('price')}
            >
              <h4 className={styles.sectionTitle}>Rango de precios</h4>
              <Icon 
                name="keyboard_arrow_down" 
                size={20}
                className={`${styles.collapseIcon} ${!collapsedSections.price ? styles.expanded : ''}`}
              />
            </button>
            <div className={`${styles.sectionContent} ${collapsedSections.price ? styles.collapsed : ''}`}>
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
        </div>

        <div className={styles.footer}>
          <button onClick={clearAllFilters} className={styles.clearAllBtn}>
            Limpiar todo
          </button>
          <button onClick={applyFiltersAndClose} className={styles.applyBtn}>
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  );
} 