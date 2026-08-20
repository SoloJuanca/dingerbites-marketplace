'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { trackFilterApplied } from '../../lib/analytics';
import { pushCatalogFilters } from '../../lib/catalogNavigation';
import styles from './SortOptions.module.css';

export default function SortOptions({ currentSort, currentInStockOnly = 'true' }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortOptions = [
    { value: 'newest', label: 'Más nuevos' },
    { value: 'oldest', label: 'Más antiguos' },
    { value: 'price_asc', label: 'Precio: menor a mayor' },
    { value: 'price_desc', label: 'Precio: mayor a menor' }
  ];

  const handleSortChange = (e) => {
    const newSort = e.target.value;
    trackFilterApplied('sort', newSort || 'default', { source: 'sort_options' });
    pushCatalogFilters(router, searchParams, { sortBy: newSort || '' });
  };

  const handleInStockChange = (e) => {
    const checked = e.target.checked;
    trackFilterApplied('in_stock', checked ? 'true' : 'false', { source: 'sort_options' });
    pushCatalogFilters(router, searchParams, { inStockOnly: checked ? 'true' : 'false' });
  };

  const isInStockOnly = String(currentInStockOnly || 'true').toLowerCase() !== 'false';

  return (
    <div className={styles.sortContainer}>
      <label htmlFor="sort-select" className={styles.label}>
        Ordenar por:
      </label>
      <select
        id="sort-select"
        value={currentSort || 'newest'}
        onChange={handleSortChange}
        className={styles.sortSelect}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label className={styles.stockToggle}>
        <input
          type="checkbox"
          className={styles.stockCheckbox}
          checked={isInStockOnly}
          onChange={handleInStockChange}
        />
        <span className={styles.stockLabel}>Mostrar solo en stock</span>
      </label>
    </div>
  );
} 