'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './FeatureInput.module.css';

export default function FeatureInput({ 
  value = '', 
  onChange, 
  placeholder = "Agregar características...",
  maxFeatures = 50,
  disabled = false,
  className = ''
}) {
  const [features, setFeatures] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Initialize features from value prop
  useEffect(() => {
    if (value && typeof value === 'string') {
      const initialFeatures = value.split('\n').map(feature => feature.trim()).filter(Boolean);
      setFeatures(initialFeatures);
    }
  }, []);

  // Update parent component when features change
  useEffect(() => {
    const featuresString = features.join('\n');
    if (onChange && featuresString !== value) {
      onChange(featuresString);
    }
  }, [features, onChange]);

  const addFeature = (featureText) => {
    const trimmedFeature = featureText.trim();
    
    if (!trimmedFeature) return;
    if (features.length >= maxFeatures) return;
    if (features.includes(trimmedFeature)) return; // Avoid duplicates
    
    const newFeatures = [...features, trimmedFeature];
    setFeatures(newFeatures);
    setInputValue('');
  };

  const removeFeature = (indexToRemove) => {
    const newFeatures = features.filter((_, index) => index !== indexToRemove);
    setFeatures(newFeatures);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addFeature(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && features.length > 0) {
      // Remove last feature if input is empty and user presses backspace
      removeFeature(features.length - 1);
    } else if (e.key === 'Tab' && inputValue.trim()) {
      e.preventDefault();
      addFeature(inputValue);
    }
  };

  const handleInputBlur = () => {
    // Add current input value as feature when losing focus (if not empty)
    if (inputValue.trim()) {
      addFeature(inputValue);
    }
  };

  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`${styles.featureInputContainer} ${className}`}>
      <div 
        className={`${styles.featureInput} ${disabled ? styles.disabled : ''}`}
        onClick={handleContainerClick}
      >
        {features.map((feature, index) => (
          <div key={index} className={styles.feature}>
            <span className={styles.featureText}>{feature}</span>
            {!disabled && (
              <button
                type="button"
                className={styles.featureRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFeature(index);
                }}
                aria-label={`Eliminar característica ${feature}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        
        {!disabled && features.length < maxFeatures && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            placeholder={features.length === 0 ? placeholder : ''}
            className={styles.input}
            disabled={disabled}
          />
        )}
      </div>
      
      {features.length > 0 && (
        <div className={styles.featureInfo}>
          <span className={styles.featureCount}>{features.length} característica{features.length !== 1 ? 's' : ''}</span>
          {features.length >= maxFeatures && (
            <span className={styles.maxReached}>Máximo alcanzado</span>
          )}
        </div>
      )}
      
      <div className={styles.helpText}>
        Presiona <strong>Enter</strong> o <strong>Tab</strong> para agregar características
      </div>
    </div>
  );
}
