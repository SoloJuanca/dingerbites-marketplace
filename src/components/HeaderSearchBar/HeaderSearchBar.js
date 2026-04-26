'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Icon from '../Icon/Icon';
import styles from './HeaderSearchBar.module.css';

export default function HeaderSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [categorySlug, setCategorySlug] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

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

  useEffect(() => {
    if (!pathname?.startsWith('/catalog')) return;
    const q = searchParams.get('q') || searchParams.get('search') || '';
    setQuery(q);
    if (pathname === '/catalog') {
      const cat = searchParams.get('category') || '';
      setCategorySlug(cat);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestions() {
      const q = query.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setActiveIndex(-1);
        return;
      }
      try {
        setIsLoadingSuggestions(true);
        const params = new URLSearchParams();
        params.set('q', q);
        if (categorySlug) params.set('category', categorySlug);
        const response = await fetch(`/api/search/suggestions?${params.toString()}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setActiveIndex(-1);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setIsLoadingSuggestions(false);
      }
    }

    const timer = setTimeout(loadSuggestions, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const buildCatalogUrl = useCallback(() => {
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
    return qs ? `/catalog?${qs}` : '/catalog';
  }, [categorySlug, query]);

  const goToCatalog = useCallback(() => {
    router.push(buildCatalogUrl());
    setSuggestions([]);
    setActiveIndex(-1);
    setIsLoadingSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur?.();
  }, [router, buildCatalogUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    goToCatalog();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      return;
    }
    if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        setQuery(selected.label);
        const params = new URLSearchParams();
        params.set('page', '1');
        if (categorySlug) params.set('category', categorySlug);
        if (selected.tcgCategoryId) params.set('tcgCategoryId', selected.tcgCategoryId);
        if (selected.tcgGroupId) params.set('tcgGroupId', selected.tcgGroupId);
        params.set('q', selected.label);
        router.push(`/catalog?${params.toString()}`);
        setSuggestions([]);
        return;
      }
      handleSubmit(e);
    }
  };

  const showSuggestions = isFocused && (suggestions.length > 0 || isLoadingSuggestions);
  const trimmedQuery = query.trim();
  const showExploreCatalog = isFocused && !isLoadingSuggestions && suggestions.length === 0 && trimmedQuery.length >= 2;
  const wrapperClass = `${styles.wrapper}${showSuggestions ? ` ${styles.wrapperOpen}` : ''}`;

  return (
    <div className={wrapperClass}>
      <form
        className={styles.form}
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
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Buscar productos..."
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Buscar productos"
            aria-autocomplete="list"
          />

          <button type="submit" className={styles.submitBtn} aria-label="Buscar">
            <Icon name="search" size={22} />
          </button>
        </div>
      </form>

      {(showSuggestions || showExploreCatalog) && (
        <div
          id="header-search-suggestions"
          className={styles.suggestionsList}
          role="listbox"
          aria-label="Sugerencias de búsqueda"
        >
          {isLoadingSuggestions ? (
            <div className={styles.suggestionItemMuted}>Buscando...</div>
          ) : showExploreCatalog ? (
            <button
              type="button"
              role="option"
              aria-selected="false"
              className={styles.suggestionItem}
              onMouseDown={(ev) => {
                ev.preventDefault();
                const params = new URLSearchParams();
                params.set('page', '1');
                if (categorySlug) params.set('category', categorySlug);
                params.set('q', trimmedQuery);
                router.push(`/catalog?${params.toString()}`);
                setSuggestions([]);
                setActiveIndex(-1);
                setIsFocused(false);
                inputRef.current?.blur?.();
              }}
            >
              <span>Explorar catálogo</span>
              <small>Ver resultados</small>
            </button>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.slug}-${suggestion.label}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`${styles.suggestionItem} ${index === activeIndex ? styles.suggestionActive : ''}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  setQuery(suggestion.label);
                  const params = new URLSearchParams();
                  params.set('page', '1');
                  if (categorySlug) params.set('category', categorySlug);
                  if (suggestion.tcgCategoryId) params.set('tcgCategoryId', suggestion.tcgCategoryId);
                  if (suggestion.tcgGroupId) params.set('tcgGroupId', suggestion.tcgGroupId);
                  params.set('q', suggestion.label);
                  router.push(`/catalog?${params.toString()}`);
                  setSuggestions([]);
                  setActiveIndex(-1);
                  setIsFocused(false);
                  inputRef.current?.blur?.();
                }}
              >
                <span>{suggestion.label}</span>
                {suggestion.category ? <small>{suggestion.category}</small> : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
