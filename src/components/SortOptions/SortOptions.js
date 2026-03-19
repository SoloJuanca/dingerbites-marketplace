'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './SortOptions.module.css';

export default function SortOptions({ currentSort }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const sortOptions = [
    { value: 'newest', label: 'Más nuevos' },
    { value: 'oldest', label: 'Más antiguos' },
    { value: 'price_asc', label: 'Precio: menor a mayor' },
    { value: 'price_desc', label: 'Precio: mayor a menor' }
  ];

  const handleSortChange = (e) => {
    const params = new URLSearchParams(searchParams);
    const newSort = e.target.value;
    
    // Resetear página cuando se cambia el ordenamiento
    params.delete('page');
    
    if (newSort) {
      params.set('sortBy', newSort);
    } else {
      params.delete('sortBy');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

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
    </div>
  );
} 