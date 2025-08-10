'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import toast from 'react-hot-toast';
import styles from './SmartComboBox.module.css';

export default function SmartComboBox({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Seleccionar...",
  createEndpoint,
  createLabel = "crear",
  onOptionsUpdate,
  disabled = false 
}) {
  // Debug logging (only if options is not an array or empty)
  if (!Array.isArray(options) || (Array.isArray(options) && options.length === 0)) {
    console.log('SmartComboBox received options:', options, 'Type:', typeof options, 'IsArray:', Array.isArray(options));
  }
  const { apiRequest } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(Array.isArray(options) ? options : []);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    console.log('SmartComboBox options:', options);
    console.log('SmartComboBox filteredOptions:', filteredOptions);
    // Ensure options is always an array
    const safeOptions = Array.isArray(options) ? options : [];
    setFilteredOptions(
      safeOptions.filter(option => 
        option && option.name && option.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(option => option && option.id === value);
  const displayValue = selectedOption ? selectedOption.name : '';

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    
    // If the input matches an existing option exactly, select it
    const exactMatch = safeOptions.find(option => 
      option && option.name && option.name.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      onChange(exactMatch.id);
    } else if (value === '') {
      onChange('');
    }
  };

  const handleOptionSelect = (option) => {
    onChange(option.id);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current.blur();
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateNew = async () => {
    if (!searchTerm.trim() || !createEndpoint) return;

    setCreating(true);
    try {
      const name = searchTerm.trim();
      const slug = generateSlug(name);
      
      const response = await apiRequest(createEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          slug: slug,
          description: `${createLabel} creada desde el formulario de producto`
        })
      });

      if (response.ok) {
        const newItem = await response.json();
        const createdItem = newItem.category || newItem.brand || newItem;
        
        // Update options
        if (onOptionsUpdate) {
          onOptionsUpdate(createdItem);
        }
        
        // Select the new item
        onChange(createdItem.id);
        setSearchTerm('');
        setIsOpen(false);
        
        toast.success(`${createLabel} "${name}" creada exitosamente`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Error al crear ${createLabel}`);
      }
    } catch (error) {
      console.error('Error creating new item:', error);
      toast.error(`Error al crear ${createLabel}`);
    } finally {
      setCreating(false);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (selectedOption) {
      setSearchTerm(selectedOption.name);
    }
  };

  const handleInputBlur = () => {
    // Small delay to allow click on dropdown options
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }, 150);
  };

  const shouldShowCreateOption = createEndpoint && 
    searchTerm.trim() && 
    !filteredOptions.some(option => 
      option.name.toLowerCase() === searchTerm.toLowerCase()
    );

  return (
    <div className={styles.comboboxContainer}>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`${styles.input} ${isOpen ? styles.inputOpen : ''}`}
        autoComplete="off"
      />
      
      <div className={styles.iconContainer}>
        <svg 
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 16 16"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {isOpen && (
        <div ref={dropdownRef} className={styles.dropdown}>
          {filteredOptions.length > 0 && (
            <div className={styles.optionsSection}>
              {filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`${styles.option} ${value === option.id ? styles.optionSelected : ''}`}
                  onClick={() => handleOptionSelect(option)}
                >
                  {option.name}
                </div>
              ))}
            </div>
          )}
          
          {shouldShowCreateOption && (
            <div className={styles.createSection}>
              {filteredOptions.length > 0 && <div className={styles.separator}></div>}
              <button
                type="button"
                className={styles.createOption}
                onClick={handleCreateNew}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <div className={styles.spinner}></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" className={styles.plusIcon}>
                      <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Crear &quot;{searchTerm}&quot;
                  </>
                )}
              </button>
            </div>
          )}

          {filteredOptions.length === 0 && !shouldShowCreateOption && (
            <div className={styles.noResults}>
              No se encontraron resultados
            </div>
          )}
        </div>
      )}
    </div>
  );
}
