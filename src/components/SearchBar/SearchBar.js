'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Icon from '../Icon/Icon';
import styles from './SearchBar.module.css';

export default function SearchBar({ placeholder = "Buscar productos..." }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const inputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize search term from URL params
  useEffect(() => {
    const search = searchParams.get('q') || searchParams.get('search') || '';
    setSearchTerm(search);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestions() {
      const q = searchTerm.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setActiveIndex(-1);
        return;
      }
      try {
        setIsLoadingSuggestions(true);
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setActiveIndex(-1);
        }
      } catch (error) {
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
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
      params.delete('search');
    } else {
      params.delete('q');
      params.delete('search');
    }
    
    // Reset to first page when searching
    params.set('page', '1');
    setSuggestions([]);
    setActiveIndex(-1);
    setIsLoadingSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur?.();
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setSearchTerm('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('search');
    params.set('page', '1');
    setSuggestions([]);
    setActiveIndex(-1);
    setIsLoadingSuggestions(false);
    router.push(`${pathname}?${params.toString()}`);
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
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        setSearchTerm(selected.label);
        const params = new URLSearchParams(searchParams.toString());
        params.set('q', selected.label);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
        setSuggestions([]);
        return;
      }
      handleSearch(e);
    }
  };

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.inputWrapper}>
          <Icon name="search" size={20} className={styles.searchIcon} />
          <input
            type="text"
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={styles.searchInput}
            aria-autocomplete="list"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              aria-label="Limpiar búsqueda"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <button type="submit" className={styles.searchButton}>
          <Icon name="search" size={20} />
          <span className={styles.searchButtonText}>Buscar</span>
        </button>
      </form>
      {isFocused && (suggestions.length > 0 || isLoadingSuggestions) && (
        <div className={styles.suggestionsList} role="listbox" aria-label="Sugerencias de búsqueda">
          {isLoadingSuggestions ? (
            <div className={styles.suggestionItemMuted}>Buscando...</div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.slug}-${suggestion.label}`}
                type="button"
                className={`${styles.suggestionItem} ${index === activeIndex ? styles.suggestionActive : ''}`}
                onMouseDown={() => {
                  setSearchTerm(suggestion.label);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('q', suggestion.label);
                  params.set('page', '1');
                  router.push(`${pathname}?${params.toString()}`);
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
