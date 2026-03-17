'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Icon from '../Icon/Icon';
import styles from './FilterSidebar.module.css';

export default function FilterSidebar({ 
  categories = [],
  brands = [],
  conditions = [],
  priceRange = { min: 0, max: 1000 },
  currentCategory, 
  currentBrand, 
  currentCondition,
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
    conditions: false,
    price: false
  });
  
  // Convertir strings de URL a arrays
  const selectedCategories = currentCategory ? currentCategory.split(',') : [];
  const selectedBrands = currentBrand ? currentBrand.split(',') : [];
  const selectedConditions = currentCondition ? currentCondition.split(',') : [];

  const categoriesByParent = categories.reduce((map, category) => {
    const parentId = category.parent_id || null;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId).push(category);
    return map;
  }, new Map());

  const getDescendantSlugs = (categoryId) => {
    const descendants = [];
    const stack = [...(categoriesByParent.get(categoryId) || [])];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      descendants.push(current.slug);
      const children = categoriesByParent.get(current.id) || [];
      stack.push(...children);
    }
    return descendants;
  };

  const hasSelectedDescendant = (categoryId) => {
    const descendants = getDescendantSlugs(categoryId);
    return descendants.some((slug) => selectedCategories.includes(slug));
  };

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

  const handleCategoryChange = (categoryValue, categoryId) => {
    let newCategories = [...selectedCategories];
    
    if (newCategories.includes(categoryValue)) {
      const descendantSlugs = getDescendantSlugs(categoryId);
      newCategories = newCategories.filter(
        (cat) => cat !== categoryValue && !descendantSlugs.includes(cat)
      );
    } else {
      newCategories.push(categoryValue);
    }
    
    updateFilters({
      category: newCategories,
      brand: selectedBrands,
      condition: selectedConditions,
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
      condition: selectedConditions,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handleConditionChange = (conditionValue) => {
    let newConditions = [...selectedConditions];

    if (newConditions.includes(conditionValue)) {
      newConditions = newConditions.filter((value) => value !== conditionValue);
    } else {
      newConditions.push(conditionValue);
    }

    updateFilters({
      category: selectedCategories,
      brand: selectedBrands,
      condition: newConditions,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handlePriceSubmit = (e) => {
    e.preventDefault();
    updateFilters({
      category: selectedCategories,
      brand: selectedBrands,
      condition: selectedConditions,
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
              {(categoriesByParent.get(null) || []).map((parentCategory) => {
                const childCategories = categoriesByParent.get(parentCategory.id) || [];
                const showChildren =
                  selectedCategories.includes(parentCategory.slug) ||
                  hasSelectedDescendant(parentCategory.id);

                return (
                  <div key={parentCategory.id}>
                    <label className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedCategories.includes(parentCategory.slug)}
                        onChange={() => handleCategoryChange(parentCategory.slug, parentCategory.id)}
                      />
                      <span className={styles.checkboxLabel}>{parentCategory.name}</span>
                    </label>
                    {showChildren &&
                      childCategories.map((childCategory) => (
                        <label
                          key={childCategory.id}
                          className={styles.checkboxItem}
                          style={{ paddingLeft: 16 }}
                        >
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={selectedCategories.includes(childCategory.slug)}
                            onChange={() => handleCategoryChange(childCategory.slug, childCategory.id)}
                          />
                          <span className={styles.checkboxLabel}>
                            ↳ {childCategory.name}
                          </span>
                        </label>
                      ))}
                  </div>
                );
              })}
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

        {/* Condición */}
        <div className={styles.filterSection}>
          <button
            className={styles.sectionHeader}
            onClick={() => toggleSection('conditions')}
          >
            <h4 className={styles.sectionTitle}>Condición</h4>
            <Icon
              name="keyboard_arrow_down"
              size={20}
              className={`${styles.collapseIcon} ${!collapsedSections.conditions ? styles.expanded : ''}`}
            />
          </button>
          <div className={`${styles.sectionContent} ${collapsedSections.conditions ? styles.collapsed : ''}`}>
            <div className={styles.brandList}>
              {conditions.map((conditionOption) => (
                <label key={conditionOption.value} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedConditions.includes(conditionOption.value)}
                    onChange={() => handleConditionChange(conditionOption.value)}
                  />
                  <span className={styles.checkboxLabel}>
                    {conditionOption.label}
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