'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Icon from '../Icon/Icon';
import styles from './FilterSidebar.module.css';

export default function FilterSidebar({ 
  categories = [],
  brands = [],
  priceRange = { min: 0, max: 1000 },
  currentCategory, 
  currentBrand, 
  currentMinPrice, 
  currentMaxPrice 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        <h3 className={styles.sidebarTitle}>Filtros</h3>
        
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
                <label key={category.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedCategories.includes(category.slug)}
                    onChange={() => handleCategoryChange(category.slug)}
                  />
                  <span className={styles.checkboxLabel}>
                    {category.name}
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
                <label key={brand.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedBrands.includes(brand.slug)}
                    onChange={() => handleBrandChange(brand.slug)}
                  />
                  <span className={styles.checkboxLabel}>
                    {brand.name}
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
    </aside>
  );
} 