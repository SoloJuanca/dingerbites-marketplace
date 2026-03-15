'use client';

import { useState, useEffect } from 'react';
import styles from './ProductDetailsInput.module.css';

const DETAIL_SEPARATOR = ': ';
const LINE_SEPARATOR = '\n';

/**
 * Parsea el string de features al formato interno.
 * "Materiales: Algodón\nDimensiones: 30x40" -> [{ name: 'Materiales', value: 'Algodón' }, ...]
 * Líneas sin ":" se guardan como value con name vacío.
 */
function parseDetailsString(str) {
  if (!str || !str.trim()) return [];
  return str.split(LINE_SEPARATOR).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const idx = trimmed.indexOf(DETAIL_SEPARATOR);
    if (idx === -1) return { name: '', value: trimmed };
    return {
      name: trimmed.slice(0, idx).trim(),
      value: trimmed.slice(idx + DETAIL_SEPARATOR.length).trim()
    };
  }).filter(Boolean);
}

/**
 * Serializa el array de detalles a string para formData/API.
 */
function serializeDetails(details) {
  return details
    .filter((d) => d.value.trim() !== '')
    .map((d) =>
      d.name.trim() ? `${d.name.trim()}${DETAIL_SEPARATOR}${d.value.trim()}` : d.value.trim()
    )
    .join(LINE_SEPARATOR);
}

export default function ProductDetailsInput({
  value = '',
  onChange,
  placeholderName = 'Ej: Materiales, Dimensiones, Altura',
  placeholderValue = 'Ej: Algodón 100%, 30x40 cm, 1.5 m',
  maxDetails = 50,
  disabled = false,
  className = ''
}) {
  const [details, setDetails] = useState([]);

  useEffect(() => {
    setDetails(parseDetailsString(value));
  }, [value]);

  useEffect(() => {
    const str = serializeDetails(details);
    if (onChange && str !== value) {
      onChange(str);
    }
  }, [details, onChange, value]);

  const addDetail = () => {
    if (details.length >= maxDetails) return;
    setDetails([...details, { name: '', value: '' }]);
  };

  const removeDetail = (index) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const updateDetail = (index, field, fieldValue) => {
    setDetails(
      details.map((d, i) =>
        i === index ? { ...d, [field]: fieldValue } : d
      )
    );
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.list}>
        {details.map((detail, index) => (
          <div key={index} className={styles.row}>
            <input
              type="text"
              value={detail.name}
              onChange={(e) => updateDetail(index, 'name', e.target.value)}
              placeholder={placeholderName}
              className={styles.inputName}
              disabled={disabled}
              aria-label={`Nombre de característica ${index + 1}`}
            />
            <input
              type="text"
              value={detail.value}
              onChange={(e) => updateDetail(index, 'value', e.target.value)}
              placeholder={placeholderValue}
              className={styles.inputValue}
              disabled={disabled}
              aria-label={`Valor de característica ${index + 1}`}
            />
            {!disabled && (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeDetail(index)}
                aria-label={`Eliminar característica ${index + 1}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && details.length < maxDetails && (
        <button
          type="button"
          className={styles.addBtn}
          onClick={addDetail}
          aria-label="Agregar característica"
        >
          Agregar característica
        </button>
      )}

      {details.length > 0 && (
        <div className={styles.footer}>
          <span className={styles.count}>
            {details.length} característica{details.length !== 1 ? 's' : ''}
          </span>
          {details.length >= maxDetails && (
            <span className={styles.maxReached}>Máximo alcanzado</span>
          )}
        </div>
      )}
    </div>
  );
}
