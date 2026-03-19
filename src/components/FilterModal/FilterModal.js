'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Icon from '../Icon/Icon';
import styles from './FilterModal.module.css';

export default function FilterModal({ 
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
  currentMaxPrice,
  isOpen = false,
  onClose = () => {}
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [minPrice, setMinPrice] = useState(currentMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || '');
  
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

    router.push(`${pathname}?${params.toString()}`);
    onClose();
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

  const clearAllFilters = () => {
    updateFilters({
      category: [],
      subcategory: [],
      manufacturerBrand: [],
      franchiseBrand: [],
      brand: [],
      condition: [],
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
                {(categoriesByParent.get(null) || []).map((parentCategory) => {
                  return (
                    <div key={parentCategory.id}>
                      <div className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          id={`cat-${parentCategory.id}`}
                          className={styles.checkbox}
                          checked={selectedCategories.includes(parentCategory.slug)}
                          onChange={() => handleCategoryChange(parentCategory.slug, parentCategory.id)}
                        />
                        <label htmlFor={`cat-${parentCategory.id}`} className={styles.checkboxLabel}>
                          {parentCategory.name}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subcategorías */}
          <div className={styles.filterSection}>
            <button className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Subcategorías</h3>
              <Icon name="expand_more" className={styles.collapseIcon} />
            </button>
            <div className={styles.sectionContent}>
              <div className={styles.brandList}>
                {(categoriesByParent.get(null) || [])
                  .filter((parentCategory) =>
                    selectedCategories.includes(parentCategory.slug) || hasSelectedDescendant(parentCategory.id)
                  )
                  .flatMap((parentCategory) =>
                    (categoriesByParent.get(parentCategory.id) || []).map((subcategory) => (
                      <div key={subcategory.id} className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          id={`subcategory-${subcategory.id}`}
                          className={styles.checkbox}
                          checked={selectedSubcategories.includes(subcategory.slug)}
                          onChange={() => handleSubcategoryChange(subcategory.slug)}
                        />
                        <label htmlFor={`subcategory-${subcategory.id}`} className={styles.checkboxLabel}>
                          {subcategory.name}
                        </label>
                      </div>
                    ))
                  )}
              </div>
            </div>
          </div>

          {/* Condición */}
          <div className={styles.filterSection}>
            <button className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Condición</h3>
              <Icon name="expand_more" className={styles.collapseIcon} />
            </button>
            <div className={styles.sectionContent}>
              <div className={styles.brandList}>
                {conditions.map((conditionOption) => (
                  <div key={conditionOption.value} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      id={`condition-${conditionOption.value.replace(/\s+/g, '-')}`}
                      className={styles.checkbox}
                      checked={selectedConditions.includes(conditionOption.value)}
                      onChange={() => handleConditionChange(conditionOption.value)}
                    />
                    <label
                      htmlFor={`condition-${conditionOption.value.replace(/\s+/g, '-')}`}
                      className={styles.checkboxLabel}
                    >
                      {conditionOption.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Marca fabricante */}
          <div className={styles.filterSection}>
            <button className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Marca fabricante</h3>
              <Icon name="expand_more" className={styles.collapseIcon} />
            </button>
            <div className={styles.sectionContent}>
              <div className={styles.brandList}>
                {manufacturerBrands.map((brandOption) => (
                  <div key={brandOption.id} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      id={`manufacturer-brand-${brandOption.id}`}
                      className={styles.checkbox}
                      checked={selectedManufacturerBrands.includes(brandOption.slug)}
                      onChange={() => handleManufacturerBrandChange(brandOption.slug)}
                    />
                    <label htmlFor={`manufacturer-brand-${brandOption.id}`} className={styles.checkboxLabel}>
                      {brandOption.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Marca franquicia */}
          <div className={styles.filterSection}>
            <button className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Marca de franquicia</h3>
              <Icon name="expand_more" className={styles.collapseIcon} />
            </button>
            <div className={styles.sectionContent}>
              <div className={styles.brandList}>
                {franchiseBrands.map((brandOption) => (
                  <div key={brandOption.id} className={styles.checkboxItem}>
                    <input
                      type="checkbox"
                      id={`franchise-brand-${brandOption.id}`}
                      className={styles.checkbox}
                      checked={selectedFranchiseBrands.includes(brandOption.slug)}
                      onChange={() => handleFranchiseBrandChange(brandOption.slug)}
                    />
                    <label htmlFor={`franchise-brand-${brandOption.id}`} className={styles.checkboxLabel}>
                      {brandOption.name}
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