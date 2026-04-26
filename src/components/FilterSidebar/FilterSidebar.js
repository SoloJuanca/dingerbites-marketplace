'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
  currentTcgCategoryId,
  currentTcgGroupId,
  currentManufacturerBrand,
  currentFranchiseBrand,
  currentBrand, 
  currentCondition,
  currentMinPrice, 
  currentMaxPrice 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [minPrice, setMinPrice] = useState(currentMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || '');
  
  // Estados para secciones colapsables
  const [collapsedSections, setCollapsedSections] = useState({
    categories: false,
    subcategories: false,
    tcgApi: false,
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

  const isTcgSelected = selectedCategories.includes('tcg');
  const selectedTcgCategoryIds = (currentTcgCategoryId || searchParams.get('tcgCategoryId') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const selectedTcgGroupIds = (currentTcgGroupId || searchParams.get('tcgGroupId') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const [tcgApiCategories, setTcgApiCategories] = useState([]);
  const [tcgApiGroups, setTcgApiGroups] = useState([]);
  const [loadingTcgApiCategories, setLoadingTcgApiCategories] = useState(false);
  const [loadingTcgApiGroups, setLoadingTcgApiGroups] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    async function loadTcgCategories() {
      if (!isTcgSelected) {
        setTcgApiCategories([]);
        setTcgApiGroups([]);
        return;
      }
      try {
        setLoadingTcgApiCategories(true);
        const res = await fetch('/api/tcg/categories', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        setTcgApiCategories(Array.isArray(data?.results) ? data.results : []);
      } catch {
        if (!cancelled) setTcgApiCategories([]);
      } finally {
        if (!cancelled) setLoadingTcgApiCategories(false);
      }
    }
    loadTcgCategories();
    return () => {
      cancelled = true;
    };
  }, [isTcgSelected]);

  useEffect(() => {
    let cancelled = false;
    async function loadTcgGroups() {
      if (!isTcgSelected || selectedTcgCategoryIds.length === 0) {
        setTcgApiGroups([]);
        return;
      }
      try {
        setLoadingTcgApiGroups(true);
        const uniqueCategoryIds = [...new Set(selectedTcgCategoryIds.map(String).filter(Boolean))];
        const groupResults = await Promise.all(
          uniqueCategoryIds.map(async (catId) => {
            try {
              const res = await fetch(`/api/tcg/${encodeURIComponent(catId)}/groups`, { cache: 'no-store' });
              const data = await res.json();
              const groups = Array.isArray(data?.results) ? data.results : [];
              return groups.map((g) => ({ ...g, __tcgCategoryId: catId }));
            } catch {
              return [];
            }
          })
        );
        const merged = groupResults.flat();
        const seen = new Set();
        const deduped = [];
        for (const g of merged) {
          const key = `${g.__tcgCategoryId}:${g.groupId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(g);
        }
        if (cancelled) return;
        setTcgApiGroups(deduped);
      } catch {
        if (!cancelled) setTcgApiGroups([]);
      } finally {
        if (!cancelled) setLoadingTcgApiGroups(false);
      }
    }
    loadTcgGroups();
    return () => {
      cancelled = true;
    };
  }, [isTcgSelected, selectedTcgCategoryIds.join(',')]);

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
  };

  const updateTcgFilters = ({ tcgCategoryIds, tcgGroupIds }) => {
    const params = new URLSearchParams(searchParams);
    params.delete('page');

    const catValue = Array.isArray(tcgCategoryIds) ? tcgCategoryIds.map(String).filter(Boolean).join(',') : '';
    const groupValue = Array.isArray(tcgGroupIds) ? tcgGroupIds.map(String).filter(Boolean).join(',') : '';

    if (catValue) params.set('tcgCategoryId', catValue);
    else params.delete('tcgCategoryId');

    if (groupValue) params.set('tcgGroupId', groupValue);
    else params.delete('tcgGroupId');

    // Subcategorías del catálogo tradicional no aplican cuando se explora TCG API
    if (isTcgSelected) params.delete('subcategory');

    router.push(`${pathname}?${params.toString()}`);
  };

  const tcgCategoryOptions = useMemo(() => {
    return (Array.isArray(tcgApiCategories) ? tcgApiCategories : []).map((c) => ({
      id: String(c.categoryId),
      label: c.displayName || c.name || String(c.categoryId)
    }));
  }, [tcgApiCategories]);

  const tcgGroupOptions = useMemo(() => {
    return (Array.isArray(tcgApiGroups) ? tcgApiGroups : []).map((g) => ({
      id: String(g.groupId),
      label: g.name || String(g.groupId)
    }));
  }, [tcgApiGroups]);

  const handleTcgCategoryToggle = (id) => {
    const key = String(id);
    const set = new Set(selectedTcgCategoryIds.map(String));
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);

    // Si cambia catálogo, reseteamos sets para evitar selección inválida.
    updateTcgFilters({ tcgCategoryIds: [...next], tcgGroupIds: [] });
  };

  const handleTcgGroupToggle = (id) => {
    const key = String(id);
    const set = new Set(selectedTcgGroupIds.map(String));
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateTcgFilters({ tcgCategoryIds: selectedTcgCategoryIds, tcgGroupIds: [...next] });
  };

  const visibleSubcategories = useMemo(() => {
    if (isTcgSelected) return [];
    const parents = (categoriesByParent.get(null) || [])
      .filter((parentCategory) =>
        selectedCategories.includes(parentCategory.slug) || hasSelectedDescendant(parentCategory.id)
      );
    return parents.flatMap((parentCategory) => (categoriesByParent.get(parentCategory.id) || []));
  }, [isTcgSelected, categoriesByParent, selectedCategories, selectedSubcategories]);

  const shouldShowSubcategoriesSection =
    !isTcgSelected && (visibleSubcategories.length > 0 || selectedSubcategories.length > 0);

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
        {shouldShowSubcategoriesSection ? (
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
                {visibleSubcategories.map((subcategory) => (
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
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isTcgSelected ? (
          <>
            {/* Catálogos TCG */}
            <div className={styles.filterSection}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection('tcgApi')}
              >
                <h4 className={styles.sectionTitle}>Catálogos TCG</h4>
                <Icon
                  name="keyboard_arrow_down"
                  size={20}
                  className={`${styles.collapseIcon} ${!collapsedSections.tcgApi ? styles.expanded : ''}`}
                />
              </button>
              <div className={`${styles.sectionContent} ${collapsedSections.tcgApi ? styles.collapsed : ''}`}>
                <div className={styles.brandList}>
                  {loadingTcgApiCategories ? (
                    <div className={styles.suggestionMuted}>Cargando catálogos…</div>
                  ) : tcgCategoryOptions.length === 0 ? (
                    <div className={styles.suggestionMuted}>No hay catálogos disponibles</div>
                  ) : (
                    tcgCategoryOptions.map((cat) => (
                      <label key={cat.id} className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedTcgCategoryIds.includes(cat.id)}
                          onChange={() => handleTcgCategoryToggle(cat.id)}
                        />
                        <span className={styles.checkboxLabel}>{cat.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sets TCG */}
            <div className={styles.filterSection}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection('tcgSets')}
              >
                <h4 className={styles.sectionTitle}>Sets TCG</h4>
                <Icon
                  name="keyboard_arrow_down"
                  size={20}
                  className={`${styles.collapseIcon} ${!collapsedSections.tcgSets ? styles.expanded : ''}`}
                />
              </button>
              <div className={`${styles.sectionContent} ${collapsedSections.tcgSets ? styles.collapsed : ''}`}>
                <div className={styles.brandList}>
                  {selectedTcgCategoryIds.length === 0 ? (
                    <div className={styles.suggestionMuted}>Selecciona al menos 1 catálogo</div>
                  ) : loadingTcgApiGroups ? (
                    <div className={styles.suggestionMuted}>Cargando sets…</div>
                  ) : tcgGroupOptions.length === 0 ? (
                    <div className={styles.suggestionMuted}>No hay sets disponibles</div>
                  ) : (
                    tcgGroupOptions.map((group) => (
                      <label key={group.id} className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedTcgGroupIds.includes(group.id)}
                          onChange={() => handleTcgGroupToggle(group.id)}
                        />
                        <span className={styles.checkboxLabel}>{group.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}

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