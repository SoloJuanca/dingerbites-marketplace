'use client';

import { useState } from 'react';
import ProductGrid from '../ProductGrid/ProductGrid';
import FilterSidebar from '../FilterSidebar/FilterSidebar';
import FilterModal from '../FilterModal/FilterModal';
import SortOptions from '../SortOptions/SortOptions';
import Icon from '../Icon/Icon';
import styles from '../../app/catalog/catalog.module.css';

export default function CatalogClient({
  categories,
  manufacturerBrands,
  franchiseBrands,
  conditions,
  priceRange,
  filters,
  initialResult
}) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const openFilterModal = () => setIsFilterModalOpen(true);
  const closeFilterModal = () => setIsFilterModalOpen(false);

  return (
    <main className={styles.catalogMain}>
      <div className={styles.container}>
        <div className={styles.catalogContent}>
          <aside className={styles.sidebar}>
            <FilterSidebar
              categories={categories}
              manufacturerBrands={manufacturerBrands}
              franchiseBrands={franchiseBrands}
              conditions={conditions}
              priceRange={priceRange}
              currentCategory={filters.category}
              currentSubcategory={filters.subcategory}
              currentManufacturerBrand={filters.manufacturerBrand}
              currentFranchiseBrand={filters.franchiseBrand}
              currentBrand={filters.brand}
              currentCondition={filters.condition}
              currentMinPrice={filters.minPrice}
              currentMaxPrice={filters.maxPrice}
              currentTcgCategoryId={filters.tcgCategoryId}
              currentTcgGroupId={filters.tcgGroupId}
            />
          </aside>

          <div className={styles.mainContent}>
            <div className={styles.sortSection}>
              <button className={styles.filterButton} onClick={openFilterModal}>
                <Icon name="tune" size={20} />
                Filtros
              </button>
              <SortOptions currentSort={filters.sortBy} currentInStockOnly={filters.inStockOnly} />
            </div>

            <ProductGrid
              currentPage={filters.currentPage}
              category={filters.category}
              subcategory={filters.subcategory}
              tcgCategoryId={filters.tcgCategoryId}
              tcgGroupId={filters.tcgGroupId}
              manufacturerBrand={filters.manufacturerBrand}
              franchiseBrand={filters.franchiseBrand}
              brand={filters.brand}
              condition={filters.condition}
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              sortBy={filters.sortBy}
              search={filters.search}
              inStockOnly={filters.inStockOnly}
              initialData={initialResult}
            />
          </div>
        </div>
      </div>

      <FilterModal
        categories={categories}
        manufacturerBrands={manufacturerBrands}
        franchiseBrands={franchiseBrands}
        conditions={conditions}
        priceRange={priceRange}
        currentCategory={filters.category}
        currentSubcategory={filters.subcategory}
        currentManufacturerBrand={filters.manufacturerBrand}
        currentFranchiseBrand={filters.franchiseBrand}
        currentBrand={filters.brand}
        currentCondition={filters.condition}
        currentMinPrice={filters.minPrice}
        currentMaxPrice={filters.maxPrice}
        currentTcgCategoryId={filters.tcgCategoryId}
        currentTcgGroupId={filters.tcgGroupId}
        isOpen={isFilterModalOpen}
        onClose={closeFilterModal}
      />
    </main>
  );
}
