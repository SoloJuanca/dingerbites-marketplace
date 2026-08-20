'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Icon from '../Icon/Icon';
import { trackSearch } from '../../lib/analytics';
import { CATALOG_MODE_TCG, TCG_SLUG } from '../../lib/catalogFilters';
import { buildCatalogUrl as buildCatalogNavigationUrl } from '../../lib/catalogNavigation';
import styles from './HeaderSearchBar.module.css';

const HEADER_TCG_VALUE = '__tcg__';

export default function HeaderSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef(null);
  const hasLoadedFiltersRef = useRef(false);
  const isLoadingFiltersRef = useRef(false);
  const [categories, setCategories] = useState([]);
  const [categorySlug, setCategorySlug] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  const loadHeaderFiltersOnce = useCallback(async () => {
    if (hasLoadedFiltersRef.current) return;
    if (isLoadingFiltersRef.current) return;
    isLoadingFiltersRef.current = true;
    try {
      const res = await fetch('/api/filters');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data.categories) ? data.categories : [];
      setCategories(list.filter((c) => c?.slug && !c.parent_id && c.slug !== TCG_SLUG));
      hasLoadedFiltersRef.current = true;
    } catch {
      // keep categories empty; we can retry on next focus/open
    } finally {
      isLoadingFiltersRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith('/catalog')) return;
    const q = searchParams.get('q') || searchParams.get('search') || '';
    setQuery(q);
    if (pathname === '/catalog') {
      const mode = searchParams.get('mode') || '';
      if (mode === CATALOG_MODE_TCG) {
        setCategorySlug(HEADER_TCG_VALUE);
      } else {
        const cat = searchParams.get('category') || '';
        setCategorySlug(cat);
      }
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
        if (categorySlug === HEADER_TCG_VALUE) {
          params.set('mode', CATALOG_MODE_TCG);
        } else if (categorySlug) {
          params.set('category', categorySlug);
        }
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
  }, [query, categorySlug]);

  const buildCatalogUrl = useCallback(() => {
    const updates = {
      page: '1',
      inStockOnly: 'true',
      q: query.trim()
    };

    if (categorySlug === HEADER_TCG_VALUE) {
      updates.mode = CATALOG_MODE_TCG;
      updates.category = '';
      updates.subcategory = '';
    } else if (categorySlug) {
      updates.category = categorySlug;
      updates.mode = '';
    } else {
      updates.mode = '';
      updates.category = '';
    }

    return buildCatalogNavigationUrl(updates, searchParams);
  }, [categorySlug, query, searchParams]);

  const buildSuggestionUrl = useCallback(
    (suggestion) => {
      const updates = {
        page: '1',
        inStockOnly: 'true',
        q: suggestion.label
      };

      if (categorySlug === HEADER_TCG_VALUE) {
        updates.mode = CATALOG_MODE_TCG;
      } else if (categorySlug) {
        updates.category = categorySlug;
      }

      if (suggestion.tcgCategoryId) updates.tcgCategoryId = suggestion.tcgCategoryId;
      if (suggestion.tcgGroupId) updates.tcgGroupId = suggestion.tcgGroupId;

      return buildCatalogNavigationUrl(updates, searchParams);
    },
    [categorySlug, searchParams]
  );

  const goToCatalog = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) trackSearch(trimmed);
    router.push(buildCatalogUrl());
    setSuggestions([]);
    setActiveIndex(-1);
    setIsLoadingSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur?.();
  }, [router, buildCatalogUrl, query]);

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
        trackSearch(selected.label);
        router.push(buildSuggestionUrl(selected));
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
              onPointerDown={loadHeaderFiltersOnce}
              onFocus={loadHeaderFiltersOnce}
              onChange={(e) => setCategorySlug(e.target.value)}
              aria-label="Filtrar por categoría"
            >
              <option value="">Todos los productos</option>
              <option value={HEADER_TCG_VALUE}>TCG</option>
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
            onFocus={() => {
              setIsFocused(true);
              loadHeaderFiltersOnce();
            }}
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
                trackSearch(trimmedQuery);
                router.push(
                  buildCatalogNavigationUrl(
                    {
                      page: '1',
                      inStockOnly: 'true',
                      q: trimmedQuery,
                      mode: categorySlug === HEADER_TCG_VALUE ? CATALOG_MODE_TCG : '',
                      category: categorySlug === HEADER_TCG_VALUE ? '' : categorySlug
                    },
                    searchParams
                  )
                );
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
                  trackSearch(suggestion.label);
                  router.push(buildSuggestionUrl(suggestion));
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
