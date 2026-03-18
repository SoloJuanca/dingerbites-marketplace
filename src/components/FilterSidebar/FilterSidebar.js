'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Icon from '../Icon/Icon';
import styles from './FilterSidebar.module.css';

export default function FilterSidebar({ 
  categories = [],
  manufacturerBrands = [],
  franchiseBrands = [],
  conditions = [],
  priceRange = { min: 0, max: 1000 },
  currentCategory, 
  currentSubcategory,
  currentManufacturerBrand,
  currentFranchiseBrand,
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
    subcategories: false,
    manufacturerBrands: false,
    franchiseBrands: false,
    conditions: false,
    price: false
  });
  
  // Convertir strings de URL a arrays
  const selectedCategories = currentCategory ? currentCategory.split(',') : [];
  const selectedSubcategories = currentSubcategory ? currentSubcategory.split(',') : [];
  const selectedManufacturerBrands = currentManufacturerBrand ? currentManufacturerBrand.split(',') : [];
  const selectedFranchiseBrands = currentFranchiseBrand ? currentFranchiseBrand.split(',') : [];
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
    return descendants.some((slug) => selectedSubcategories.includes(slug));
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
    let newSubcategories = [...selectedSubcategories];
    
    if (newCategories.includes(categoryValue)) {
      const descendantSlugs = getDescendantSlugs(categoryId);
      newCategories = newCategories.filter(
        (cat) => cat !== categoryValue
      );
      newSubcategories = newSubcategories.filter((slug) => !descendantSlugs.includes(slug));
    } else {
      newCategories.push(categoryValue);
    }
    
    updateFilters({
      category: newCategories,
      subcategory: newSubcategories,
      manufacturerBrand: selectedManufacturerBrands,
      franchiseBrand: selectedFranchiseBrands,
      brand: selectedBrands,
      condition: selectedConditions,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handleSubcategoryChange = (subcategoryValue) => {
    let newSubcategories = [...selectedSubcategories];
    
    if (newSubcategories.includes(subcategoryValue)) {
      newSubcategories = newSubcategories.filter((subcategory) => subcategory !== subcategoryValue);
    } else {
      newSubcategories.push(subcategoryValue);
    }
    
    updateFilters({
      category: selectedCategories,
      subcategory: newSubcategories,
      manufacturerBrand: selectedManufacturerBrands,
      franchiseBrand: selectedFranchiseBrands,
      brand: selectedBrands,
      condition: selectedConditions,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handleManufacturerBrandChange = (brandValue) => {
    let newManufacturerBrands = [...selectedManufacturerBrands];
    if (newManufacturerBrands.includes(brandValue)) {
      newManufacturerBrands = newManufacturerBrands.filter((brandSlug) => brandSlug !== brandValue);
    } else {
      newManufacturerBrands.push(brandValue);
    }

    updateFilters({
      category: selectedCategories,
      subcategory: selectedSubcategories,
      manufacturerBrand: newManufacturerBrands,
      franchiseBrand: selectedFranchiseBrands,
      brand: selectedBrands,
      condition: selectedConditions,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice
    });
  };

  const handleFranchiseBrandChange = (brandValue) => {
    let newFranchiseBrands = [...selectedFranchiseBrands];
    if (newFranchiseBrands.includes(brandValue)) {
      newFranchiseBrands = newFranchiseBrands.filter((brandSlug) => brandSlug !== brandValue);
    } else {
      newFranchiseBrands.push(brandValue);
    }

    updateFilters({
      category: selectedCategories,
      subcategory: selectedSubcategories,
      manufacturerBrand: selectedManufacturerBrands,
      franchiseBrand: newFranchiseBrands,
      brand: selectedBrands,
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
      subcategory: selectedSubcategories,
      manufacturerBrand: selectedManufacturerBrands,
      franchiseBrand: selectedFranchiseBrands,
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
      subcategory: selectedSubcategories,
      manufacturerBrand: selectedManufacturerBrands,
      franchiseBrand: selectedFranchiseBrands,
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subcategorías */}
        <div className={styles.filterSection}>
          <button
            className={styles.sectionHeader}
            onClick={() => toggleSection('subcategories')}
          >
            <h4 className={styles.sectionTitle}>Subcategorías</h4>
            <Icon
              name="keyboard_arrow_down"
              size={20}
              className={`${styles.collapseIcon} ${!collapsedSections.subcategories ? styles.expanded : ''}`}
            />
          </button>
          <div className={`${styles.sectionContent} ${collapsedSections.subcategories ? styles.collapsed : ''}`}>
            <div className={styles.brandList}>
              {(categoriesByParent.get(null) || [])
                .filter((parentCategory) =>
                  selectedCategories.includes(parentCategory.slug) || hasSelectedDescendant(parentCategory.id)
                )
                .flatMap((parentCategory) =>
                  (categoriesByParent.get(parentCategory.id) || []).map((subcategory) => (
                    <label key={subcategory.id} className={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedSubcategories.includes(subcategory.slug)}
                        onChange={() => handleSubcategoryChange(subcategory.slug)}
                      />
                      <span className={styles.checkboxLabel}>
                        {subcategory.name}
                      </span>
                    </label>
                  ))
                )}
            </div>
          </div>
        </div>

        {/* Marca fabricante */}
        <div className={styles.filterSection}>
          <button
            className={styles.sectionHeader}
            onClick={() => toggleSection('manufacturerBrands')}
          >
            <h4 className={styles.sectionTitle}>Marca fabricante</h4>
            <Icon
              name="keyboard_arrow_down"
              size={20}
              className={`${styles.collapseIcon} ${!collapsedSections.manufacturerBrands ? styles.expanded : ''}`}
            />
          </button>
          <div className={`${styles.sectionContent} ${collapsedSections.manufacturerBrands ? styles.collapsed : ''}`}>
            <div className={styles.brandList}>
              {manufacturerBrands.map((brandOption) => (
                <label key={brandOption.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedManufacturerBrands.includes(brandOption.slug)}
                    onChange={() => handleManufacturerBrandChange(brandOption.slug)}
                  />
                  <span className={styles.checkboxLabel}>{brandOption.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Marca franquicia */}
        <div className={styles.filterSection}>
          <button
            className={styles.sectionHeader}
            onClick={() => toggleSection('franchiseBrands')}
          >
            <h4 className={styles.sectionTitle}>Marca de franquicia</h4>
            <Icon
              name="keyboard_arrow_down"
              size={20}
              className={`${styles.collapseIcon} ${!collapsedSections.franchiseBrands ? styles.expanded : ''}`}
            />
          </button>
          <div className={`${styles.sectionContent} ${collapsedSections.franchiseBrands ? styles.collapsed : ''}`}>
            <div className={styles.brandList}>
              {franchiseBrands.map((brandOption) => (
                <label key={brandOption.id} className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedFranchiseBrands.includes(brandOption.slug)}
                    onChange={() => handleFranchiseBrandChange(brandOption.slug)}
                  />
                  <span className={styles.checkboxLabel}>{brandOption.name}</span>
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