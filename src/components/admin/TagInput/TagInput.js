'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './TagInput.module.css';

export default function TagInput({ 
  value = '', 
  onChange, 
  placeholder = "Agregar etiquetas...",
  maxTags = 20,
  disabled = false,
  className = ''
}) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Initialize tags from value prop
  useEffect(() => {
    if (value && typeof value === 'string') {
      const initialTags = value.split(',').map(tag => tag.trim()).filter(Boolean);
      setTags(initialTags);
    }
  }, []);

  // Update parent component when tags change
  useEffect(() => {
    const tagsString = tags.join(', ');
    if (onChange && tagsString !== value) {
      onChange(tagsString);
    }
  }, [tags, onChange]);

  const addTag = (tagText) => {
    const trimmedTag = tagText.trim();
    
    if (!trimmedTag) return;
    if (tags.length >= maxTags) return;
    if (tags.includes(trimmedTag)) return; // Avoid duplicates
    
    const newTags = [...tags, trimmedTag];
    setTags(newTags);
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(newTags);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // Check for comma or semicolon
    if (value.includes(',') || value.includes(';')) {
      const parts = value.split(/[,;]/);
      const newTag = parts[0];
      const remainingText = parts.slice(1).join(',');
      
      if (newTag.trim()) {
        addTag(newTag);
      }
      
      // Set remaining text as new input value
      setInputValue(remainingText);
    } else {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag if input is empty and user presses backspace
      removeTag(tags.length - 1);
    } else if (e.key === 'Tab' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleInputBlur = () => {
    // Add current input value as tag when losing focus (if not empty)
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`${styles.tagInputContainer} ${className}`}>
      <div 
        className={`${styles.tagInput} ${disabled ? styles.disabled : ''}`}
        onClick={handleContainerClick}
      >
        {tags.map((tag, index) => (
          <div key={index} className={styles.tag}>
            <span className={styles.tagText}>{tag}</span>
            {!disabled && (
              <button
                type="button"
                className={styles.tagRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                aria-label={`Eliminar etiqueta ${tag}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        {!disabled && tags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            className={styles.input}
            disabled={disabled}
          />
        )}
      </div>
      
      {tags.length > 0 && (
        <div className={styles.tagInfo}>
          <span className={styles.tagCount}>{tags.length} etiqueta{tags.length !== 1 ? 's' : ''}</span>
          {tags.length >= maxTags && (
            <span className={styles.maxReached}>Máximo alcanzado</span>
          )}
        </div>
      )}
      
      <div className={styles.helpText}>
        Presiona <strong>Enter</strong>, <strong>Tab</strong> o escribe una <strong>coma</strong> para agregar etiquetas
      </div>
    </div>
  );
}
