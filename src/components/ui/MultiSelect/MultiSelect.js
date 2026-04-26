'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import styles from './MultiSelect.module.css';

function normalizeString(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export default function MultiSelect({
  label,
  ariaLabel,
  placeholder = 'Selecciona…',
  options = [],
  value = [],
  onChange,
  disabled = false,
  searchable = true,
  maxVisibleChips = 2,
  emptyText = 'Sin resultados',
  selectAllLabel = 'Seleccionar todo',
  clearLabel = 'Limpiar',
}) {
  const inputId = useId();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const selectedIds = useMemo(() => new Set((Array.isArray(value) ? value : []).map(String)), [value]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return safeOptions;
    const q = normalizeString(query.trim());
    return safeOptions.filter((opt) => normalizeString(opt.name).includes(q));
  }, [query, safeOptions, searchable]);

  const selectedOptions = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return safeOptions.filter((o) => selectedIds.has(String(o.id)));
  }, [safeOptions, selectedIds]);

  const visibleChips = selectedOptions.slice(0, Math.max(0, maxVisibleChips));
  const hiddenCount = Math.max(0, selectedOptions.length - visibleChips.length);

  const listboxId = `${inputId}-listbox`;
  const labelId = `${inputId}-label`;

  const close = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  };

  useEffect(() => {
    const onDocMouseDown = (e) => {
      const target = e.target;
      if (!target) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!searchable) return;
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open, searchable]);

  const setSelected = (nextIds) => {
    if (typeof onChange === 'function') onChange(nextIds);
  };

  const toggleOne = (id) => {
    const key = String(id);
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(Array.from(next));
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredOptions.forEach((o) => next.add(String(o.id)));
    setSelected(Array.from(next));
  };

  const clearAll = () => setSelected([]);

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((v) => !v);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((idx) => {
        const next = Math.min(filteredOptions.length - 1, Math.max(0, idx + 1));
        return Number.isFinite(next) ? next : 0;
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((idx) => {
        const next = Math.max(0, idx - 1);
        return Number.isFinite(next) ? next : 0;
      });
    }
  };

  const onPanelKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((idx) => Math.min(filteredOptions.length - 1, Math.max(0, idx + 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((idx) => Math.max(0, idx - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        toggleOne(filteredOptions[activeIndex].id);
      }
    }
  };

  const triggerText =
    selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} seleccionado${selectedOptions.length === 1 ? '' : 's'}`;

  return (
    <div className={styles.root}>
      {label ? (
        <div id={labelId} className={styles.label}>
          {label}
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={label ? labelId : undefined}
        aria-label={!label ? ariaLabel : undefined}
      >
        <div className={styles.triggerInner}>
          <div className={styles.chips}>
            {visibleChips.map((chip) => (
              <span key={chip.id} className={styles.chip}>
                <span className={styles.chipText}>{chip.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Quitar ${chip.name}`}
                  className={styles.chipRemove}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleOne(chip.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleOne(chip.id);
                    }
                  }}
                >
                  ×
                </span>
              </span>
            ))}
            {hiddenCount > 0 ? <span className={styles.more}>+{hiddenCount}</span> : null}
            <span className={styles.triggerText}>{triggerText}</span>
          </div>
          <span className={styles.chevron} aria-hidden="true">
            ▾
          </span>
        </div>
      </button>

      {open ? (
        <div ref={panelRef} className={styles.panel} onKeyDown={onPanelKeyDown}>
          {searchable ? (
            <div className={styles.searchRow}>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.search}
                placeholder="Buscar…"
                aria-label="Buscar opciones"
              />
              <button
                type="button"
                className={styles.action}
                onClick={selectAllFiltered}
                disabled={filteredOptions.length === 0}
              >
                {selectAllLabel}
              </button>
              <button
                type="button"
                className={styles.action}
                onClick={clearAll}
                disabled={selectedOptions.length === 0}
              >
                {clearLabel}
              </button>
            </div>
          ) : (
            <div className={styles.actionsOnly}>
              <button
                type="button"
                className={styles.action}
                onClick={selectAllFiltered}
                disabled={filteredOptions.length === 0}
              >
                {selectAllLabel}
              </button>
              <button
                type="button"
                className={styles.action}
                onClick={clearAll}
                disabled={selectedOptions.length === 0}
              >
                {clearLabel}
              </button>
            </div>
          )}

          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            className={styles.list}
            tabIndex={-1}
          >
            {filteredOptions.length === 0 ? (
              <div className={styles.empty}>{emptyText}</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const checked = selectedIds.has(String(opt.id));
                const active = idx === activeIndex;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className={`${styles.option} ${checked ? styles.optionSelected : ''} ${active ? styles.optionActive : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => toggleOne(opt.id)}
                  >
                    <span className={styles.checkbox} aria-hidden="true">
                      {checked ? '✓' : ''}
                    </span>
                    <span className={styles.optionText}>{opt.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

