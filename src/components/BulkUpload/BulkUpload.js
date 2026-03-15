'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import styles from './BulkUpload.module.css';

export default function BulkUpload() {
  const { apiRequest } = useAuth();
  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.toLowerCase().endsWith('.csv')) {
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
      formData.append('dryRun', String(dryRun));
      formData.append('categoryId', '89');
      formData.append('groupId', '24344');

      const response = await apiRequest('/api/admin/products/tcg-bulk-upload', {
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

  const downloadTemplate = async () => {
    const template = 'Nombre,Stock Normal,Stock Foil\nBlazing Scorcher,15,1\nFury Rune,9,0';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_tcg_bulk_upload.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>📦 Carga Masiva TCG (Riftbound)</h2>
        <p>Importa stock por carta para Normal/Foil con integración TCG (89/24344)</p>
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
          <label className={styles.dryRunOption}>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            Ejecutar en modo simulación (dry run)
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={styles.uploadButton}
          >
            {uploading
              ? '⏳ Procesando...'
              : dryRun
                ? '🧪 Validar CSV'
                : '🚀 Importar Stock'}
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
          <h3>✅ Resultado del Proceso</h3>
          
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Filas CSV:</span>
              <span className={styles.summaryValue}>{results.summary.totalRows}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Agrupadas:</span>
              <span className={styles.summaryValue}>{results.summary.groupedCards}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Creados:</span>
              <span className={styles.summaryValueSuccess}>{results.summary.created}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Actualizados:</span>
              <span className={styles.summaryValueSuccess}>{results.summary.updated}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>No encontrados:</span>
              <span className={styles.summaryValueError}>{results.summary.unmatched}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Warnings:</span>
              <span className={styles.summaryValueError}>{results.summary.warnings}</span>
            </div>
          </div>

          {Array.isArray(results.report?.created) && results.report.created.length > 0 && (
            <div className={styles.successSection}>
              <h4>✅ Productos Creados</h4>
              <div className={styles.productList}>
                {results.report.created.map((product, index) => (
                  <div key={index} className={styles.productItem}>
                    <span className={styles.productName}>{product.name}</span>
                    <span className={styles.productPrice}>Stock: {product.stock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(results.report?.updated) && results.report.updated.length > 0 && (
            <div className={styles.successSection}>
              <h4>🔄 Productos Actualizados</h4>
              <div className={styles.productList}>
                {results.report.updated.map((product, index) => (
                  <div key={index} className={styles.productItem}>
                    <span className={styles.productName}>{product.name}</span>
                    <span className={styles.productPrice}>Stock: {product.stock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(results.report?.unmatched) && results.report.unmatched.length > 0 && (
            <div className={styles.errorSection}>
              <h4>❌ Cartas No Encontradas en TCG</h4>
              <div className={styles.errorList}>
                {results.report.unmatched.map((entry, index) => (
                  <div key={index} className={styles.errorItem}>
                    <span className={styles.errorRow}>{entry.sourceNames?.[0]}:</span>
                    <span className={styles.errorMessage}>{entry.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(results.report?.warnings) && results.report.warnings.length > 0 && (
            <div className={styles.errorSection}>
              <h4>⚠️ Warnings</h4>
              <div className={styles.errorList}>
                {results.report.warnings.map((warning, index) => (
                  <div key={index} className={styles.errorItem}>
                    <span className={styles.errorRow}>{warning.card}:</span>
                    <span className={styles.errorMessage}>{warning.reason}</span>
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
          <li>Usa columnas: Nombre, Stock Normal, Stock Foil</li>
          <li>Primero ejecuta dry run para revisar no encontrados y warnings</li>
          <li>Normal y Foil se guardan como productos separados</li>
          <li>La importación usa integración TCG: categoría 89 y grupo 24344</li>
          <li>El upsert se hace por tcg_product_id + tcg_sub_type_name</li>
        </ul>
      </div>
    </div>
  );
}