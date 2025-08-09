'use client';

import { useState } from 'react';
import styles from './BulkUpload.module.css';

export default function BulkUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Por favor selecciona un archivo CSV válido');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo CSV');
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir el archivo');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/template_bulk_upload_productos.csv';
    link.download = 'template_bulk_upload_productos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>📦 Carga Masiva de Productos</h2>
        <p>Sube múltiples productos a la vez usando un archivo CSV</p>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.fileInput}>
          <label htmlFor="csv-file" className={styles.fileLabel}>
            <span className={styles.fileIcon}>📁</span>
            <span className={styles.fileText}>
              {file ? file.name : 'Seleccionar archivo CSV'}
            </span>
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />
        </div>

        {file && (
          <div className={styles.fileInfo}>
            <p>📄 Archivo seleccionado: <strong>{file.name}</strong></p>
            <p>📊 Tamaño: {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={styles.uploadButton}
          >
            {uploading ? '⏳ Subiendo...' : '🚀 Subir Productos'}
          </button>

          <button
            onClick={downloadTemplate}
            className={styles.templateButton}
          >
            📥 Descargar Template
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className={styles.results}>
          <h3>✅ Resultados de la Carga</h3>
          
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total procesados:</span>
              <span className={styles.summaryValue}>{results.results.total}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Exitosos:</span>
              <span className={styles.summaryValueSuccess}>{results.results.success.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Errores:</span>
              <span className={styles.summaryValueError}>{results.results.errors.length}</span>
            </div>
          </div>

          {results.results.success.length > 0 && (
            <div className={styles.successSection}>
              <h4>✅ Productos Creados Exitosamente</h4>
              <div className={styles.productList}>
                {results.results.success.map((product, index) => (
                  <div key={index} className={styles.productItem}>
                    <span className={styles.productName}>{product.name}</span>
                    <span className={styles.productPrice}>${product.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.results.errors.length > 0 && (
            <div className={styles.errorSection}>
              <h4>❌ Errores Encontrados</h4>
              <div className={styles.errorList}>
                {results.results.errors.map((error, index) => (
                  <div key={index} className={styles.errorItem}>
                    <span className={styles.errorRow}>Fila {error.row}:</span>
                    <span className={styles.errorMessage}>{error.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.instructions}>
        <h3>📋 Instrucciones</h3>
        <ul>
          <li>Descarga el template CSV para ver el formato correcto</li>
          <li>Asegúrate de que las categorías y marcas existan en el sistema</li>
          <li>Los campos obligatorios son: nombre, precio, categoria, activo</li>
          <li>Los precios deben estar en formato decimal (ej: 89.00)</li>
          <li>Los valores booleanos deben ser: true o false</li>
          <li>Las imágenes deben ser URLs válidas (recomendamos Unsplash)</li>
        </ul>
      </div>
    </div>
  );
} 