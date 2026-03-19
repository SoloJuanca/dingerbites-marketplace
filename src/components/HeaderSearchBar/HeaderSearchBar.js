'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../Icon/Icon';
import styles from './HeaderSearchBar.module.css';

export default function HeaderSearchBar() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [categorySlug, setCategorySlug] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/filters');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.categories) ? data.categories : [];
        if (!cancelled) {
          setCategories(list.filter((c) => c?.slug && !c.parent_id));
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const goToCatalog = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (categorySlug) {
      params.set('category', categorySlug);
    }
    const trimmed = query.trim();
    if (trimmed) {
      params.set('q', trimmed);
    }
    const qs = params.toString();
    router.push(qs ? `/catalog?${qs}` : '/catalog');
  }, [router, categorySlug, query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    goToCatalog();
  };

  return (
    <form
      className={styles.wrapper}
      onSubmit={handleSubmit}
      role="search"
      aria-label="Buscar en el catálogo"
    >
      <div className={styles.bar}>
        <label className={styles.categoryLabel} htmlFor="header-search-category">
          <span className={styles.visuallyHidden}>Categoría</span>
          <select
            id="header-search-category"
            className={styles.categorySelect}
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todos</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <input
          type="search"
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos..."
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Buscar productos"
        />

        <button type="submit" className={styles.submitBtn} aria-label="Buscar">
          <Icon name="search" size={22} />
        </button>
      </div>
    </form>
  );
}
