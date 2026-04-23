'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './orders.module.css';

export default function OrdersToolbar({
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  effectiveStatuses,
  orders,
  getStatusColor,
}) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearchChange = (value) => {
    setLocalSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange('search', value);
    }, 300);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const statusCounts = {};
  let totalCount = orders.length;
  effectiveStatuses.forEach((s) => {
    statusCounts[s.name || s.id] = 0;
  });
  orders.forEach((o) => {
    const key = o.status_name || o.status_id;
    if (key && statusCounts[key] !== undefined) {
      statusCounts[key]++;
    }
  });

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarTop}>
        <div className={styles.searchWrapper}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar pedidos..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className={styles.toolbarControls}>
          <div className={styles.dateRangeGroup}>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              placeholder="Desde"
            />
            <span className={styles.dateSeparator}>-</span>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              placeholder="Hasta"
            />
          </div>

          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="newest">Mas reciente</option>
            <option value="oldest">Mas antiguo</option>
            <option value="highest">Mayor monto</option>
            <option value="lowest">Menor monto</option>
          </select>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'table' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => onViewModeChange('table')}
              title="Vista tabla"
              aria-label="Vista tabla"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>table_rows</span>
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'kanban' ? styles.viewToggleBtnActive : ''}`}
              onClick={() => onViewModeChange('kanban')}
              title="Vista kanban"
              aria-label="Vista kanban"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>view_kanban</span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.statusPills}>
        <button
          className={`${styles.statusPill} ${filters.status === '' ? styles.statusPillActive : ''}`}
          onClick={() => onFilterChange('status', '')}
        >
          Todos
          <span className={styles.pillCount}>{totalCount}</span>
        </button>
        {effectiveStatuses.map((s) => {
          const key = s.name || s.id;
          const count = statusCounts[key] || 0;
          const isActive = filters.status === key;
          return (
            <button
              key={s.id}
              className={`${styles.statusPill} ${isActive ? styles.statusPillActive : ''}`}
              onClick={() => onFilterChange('status', key)}
            >
              {s.label}
              <span className={styles.pillCount}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
