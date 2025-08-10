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
  currentMaxPrice 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(currentMinPrice || '');
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || '');
  
  // Convertir strings de URL a arrays
  const selectedCategories = currentCategory ? currentCategory.split(',') : [];
  const selectedBrands = currentBrand ? currentBrand.split(',') : [];

  // Abrir modal cuando se hace clic en el botón de filtros
  useEffect(() => {
    const filterButton = document.getElementById('filterButton');
    if (filterButton) {
      filterButton.addEventListener('click', () => setIsOpen(true));
    }

    return () => {
      if (filterButton) {
        filterButton.removeEventListener('click', () => setIsOpen(true));
      }
    };
  }, []);

  const closeModal = () => setIsOpen(false);

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
    closeModal();
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
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Filtros</h2>
          <button className={styles.closeButton} onClick={closeModal}>
            <Icon name="close" size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Categorías */}
          <div className={styles.filterSection}>
            <h3>Categorías</h3>
            <div className={styles.filterOptions}>
              {categories.map((cat) => (
                <label key={cat.id} className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.slug)}
                    onChange={() => handleCategoryChange(cat.slug)}
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Marcas */}
          <div className={styles.filterSection}>
            <h3>Marcas</h3>
            <div className={styles.filterOptions}>
              {brands.map((brand) => (
                <label key={brand.id} className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.slug)}
                    onChange={() => handleBrandChange(brand.slug)}
                  />
                  <span>{brand.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rango de Precios */}
          <div className={styles.filterSection}>
            <h3>Rango de Precios</h3>
            <form onSubmit={handlePriceSubmit} className={styles.priceForm}>
              <div className={styles.priceInputs}>
                <div className={styles.priceInput}>
                  <label>Mínimo</label>
                  <input
                    type="number"
                    placeholder={`$${priceRange.min}`}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min={priceRange.min}
                    max={priceRange.max}
                  />
                </div>
                <div className={styles.priceInput}>
                  <label>Máximo</label>
                  <input
                    type="number"
                    placeholder={`$${priceRange.max}`}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min={priceRange.min}
                    max={priceRange.max}
                  />
                </div>
              </div>
              <button type="submit" className={styles.applyButton}>
                Aplicar Precios
              </button>
            </form>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.clearButton} onClick={clearAllFilters}>
            Limpiar Filtros
          </button>
          <button className={styles.closeModalButton} onClick={closeModal}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
} 