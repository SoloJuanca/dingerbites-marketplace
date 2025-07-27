'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getCategories, getBrands, getPriceRange } from '../../lib/products';
import Icon from '../Icon/Icon';
import styles from './FilterModal.module.css';

export default function FilterModal({ 
  isOpen,
  onClose,
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
  
  // Estados para secciones colapsables
  const [collapsedSections, setCollapsedSections] = useState({
    categories: false,
    brands: false,
    price: false
  });
  
  // Convertir strings de URL a arrays
  const selectedCategories = currentCategory ? currentCategory.split(',') : [];
  const selectedBrands = currentBrand ? currentBrand.split(',') : [];

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
    
    // Resetear página cuando se cambian filtros
    params.delete('page');
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value.length > 0) {
        // Si es array, convertir a string separado por comas
        const stringValue = Array.isArray(value) ? value.join(',') : value;
        params.set(key, stringValue);
      } else {
        params.delete(key);
      }
    });

    router.push(`/catalog?${params.toString()}`);
  };

  const handleCategoryChange = (categoryValue) => {
    let newCategories = [...selectedCategories];
    
    if (newCategories.includes(categoryValue)) {
      // Remover categoría si ya está seleccionada
      newCategories = newCategories.filter(cat => cat !== categoryValue);
    } else {
      // Agregar nueva categoría
      newCategories.push(categoryValue);
    }
    
    updateFilters({
      category: newCategories,
      brand: selectedBrands,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handleBrandChange = (brandValue) => {
    let newBrands = [...selectedBrands];
    
    if (newBrands.includes(brandValue)) {
      // Remover marca si ya está seleccionada
      newBrands = newBrands.filter(brand => brand !== brandValue);
    } else {
      // Agregar nueva marca
      newBrands.push(brandValue);
    }
    
    updateFilters({
      category: selectedCategories,
      brand: newBrands,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handlePriceSubmit = (e) => {
    e.preventDefault();
    updateFilters({
      category: selectedCategories,
      brand: selectedBrands,
      minPrice: minPrice,
      maxPrice: maxPrice
    });
  };

  const clearAllFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    router.push('/catalog');
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
                  <label key={category.value} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selectedCategories.includes(category.value)}
                      onChange={() => handleCategoryChange(category.value)}
                    />
                    <span className={styles.checkboxLabel}>
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Marcas */}
          <div className={styles.filterSection}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection('brands')}
            >
              <h4 className={styles.sectionTitle}>Marcas</h4>
              <Icon 
                name="keyboard_arrow_down" 
                size={20}
                className={`${styles.collapseIcon} ${!collapsedSections.brands ? styles.expanded : ''}`}
              />
            </button>
            <div className={`${styles.sectionContent} ${collapsedSections.brands ? styles.collapsed : ''}`}>
              <div className={styles.brandList}>
                {brands.map((brand) => (
                  <label key={brand} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandChange(brand)}
                    />
                    <span className={styles.checkboxLabel}>
                      {brand}
                    </span>
                  </label>
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