'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '../Icon/Icon';
import styles from './FilterModal.module.css';

export default function FilterModal({ 
  categories = [],
  brands = [],
  priceRange = { min: 0, max: 1000 },
  currentCategory, 
  currentBrand, 
  currentMinPrice, 
  currentMaxPrice,
  isOpen = false,
  onClose = () => {}
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(currentMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || '');
  
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
    onClose();
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
    updateFilters({
      category: [],
      brand: [],
      minPrice: '',
      maxPrice: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filtros</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Categorías */}
          <div className={styles.filterSection}>
            <button className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Categorías</h3>
              <Icon name="expand_more" className={styles.collapseIcon} />
            </button>
            <div className={styles.sectionContent}>
              <div className={styles.categoryList}>
                {categories.map((cat) => (
                  <div key={cat.id} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      id={`cat-${cat.id}`}
                      className={styles.checkbox}
                      checked={selectedCategories.includes(cat.slug)}
                      onChange={() => handleCategoryChange(cat.slug)}
                    />
                    <label htmlFor={`cat-${cat.id}`} className={styles.checkboxLabel}>
                      {cat.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Marcas */}
          <div className={styles.filterSection}>
            <button className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Marcas</h3>
              <Icon name="expand_more" className={styles.collapseIcon} />
            </button>
            <div className={styles.sectionContent}>
              <div className={styles.brandList}>
                {brands.map((brand) => (
                  <div key={brand.id} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      id={`brand-${brand.id}`}
                      className={styles.checkbox}
                      checked={selectedBrands.includes(brand.slug)}
                      onChange={() => handleBrandChange(brand.slug)}
                    />
                    <label htmlFor={`brand-${brand.id}`} className={styles.checkboxLabel}>
                      {brand.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rango de Precios */}
          <div className={styles.filterSection}>
            <button className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Rango de Precios</h3>
              <Icon name="expand_more" className={styles.collapseIcon} />
            </button>
            <div className={styles.sectionContent}>
              <form onSubmit={handlePriceSubmit} className={styles.priceForm}>
                <div className={styles.priceInputs}>
                  <input
                    type="number"
                    className={styles.priceInput}
                    placeholder={`$${priceRange.min}`}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min={priceRange.min}
                    max={priceRange.max}
                  />
                  <span className={styles.priceSeparator}>-</span>
                  <input
                    type="number"
                    className={styles.priceInput}
                    placeholder={`$${priceRange.max}`}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min={priceRange.min}
                    max={priceRange.max}
                  />
                </div>
                <button type="submit" className={styles.priceBtn}>
                  Aplicar Precios
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.clearAllBtn} onClick={clearAllFilters}>
            Limpiar Filtros
          </button>
          <button className={styles.applyBtn} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
} 