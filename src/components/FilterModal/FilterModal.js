'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '../Icon/Icon';
import styles from './FilterModal.module.css';

export default function FilterModal({ 
  categories = [],
  brands = [],
  conditions = [],
  priceRange = { min: 0, max: 1000 },
  currentCategory, 
  currentBrand, 
  currentCondition,
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

  const clearAllFilters = () => {
    updateFilters({
      category: [],
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
                  const childCategories = categoriesByParent.get(parentCategory.id) || [];
                  const showChildren =
                    selectedCategories.includes(parentCategory.slug) ||
                    hasSelectedDescendant(parentCategory.id);

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
                      {showChildren &&
                        childCategories.map((childCategory) => (
                          <div
                            key={childCategory.id}
                            className={styles.checkboxItem}
                            style={{ paddingLeft: 16 }}
                          >
                            <input
                              type="checkbox"
                              id={`cat-${childCategory.id}`}
                              className={styles.checkbox}
                              checked={selectedCategories.includes(childCategory.slug)}
                              onChange={() => handleCategoryChange(childCategory.slug, childCategory.id)}
                            />
                            <label htmlFor={`cat-${childCategory.id}`} className={styles.checkboxLabel}>
                              ↳ {childCategory.name}
                            </label>
                          </div>
                        ))}
                    </div>
                  );
                })}
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