'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { downloadTcgBulkTemplateCsv } from '../../lib/tcgBulkTemplateDownload';
import styles from './BulkUpload.module.css';

const DEFAULT_CATEGORY_ID = 89;
const DEFAULT_GROUP_ID = 24344;

export default function BulkUpload() {
  const { apiRequest } = useAuth();
  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [stockMode, setStockMode] = useState('increment'); // safer default
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [tcgCategories, setTcgCategories] = useState([]);
  const [tcgGroups, setTcgGroups] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectorError, setSelectorError] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      setSelectorError(null);
      try {
        const response = await fetch('/api/tcg/categories', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'No se pudieron cargar las categorías TCG');
        }

        const categories = Array.isArray(data.results) ? data.results : [];
        setTcgCategories(categories);

        const defaultCategory = categories.find(
          (category) => Number(category.categoryId) === DEFAULT_CATEGORY_ID
        );
        if (defaultCategory) {
          setSelectedCategoryId(String(defaultCategory.categoryId));
          return;
        }

        if (categories[0]?.categoryId != null) {
          setSelectedCategoryId(String(categories[0].categoryId));
        }
      } catch (err) {
        setSelectorError(err.message || 'Error al cargar categorías TCG');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadGroups = async () => {
      if (!selectedCategoryId) {
        setTcgGroups([]);
        setSelectedGroupId('');
        return;
      }

      setLoadingGroups(true);
      setSelectorError(null);
      try {
        const response = await fetch(`/api/tcg/${selectedCategoryId}/groups`, {
          cache: 'no-store'
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'No se pudieron cargar los grupos TCG');
        }

        const groups = Array.isArray(data.results) ? data.results : [];
        setTcgGroups(groups);

        const defaultGroup = groups.find(
          (group) => Number(group.groupId) === DEFAULT_GROUP_ID
        );
        if (defaultGroup) {
          setSelectedGroupId(String(defaultGroup.groupId));
          return;
        }

        if (groups[0]?.groupId != null) {
          setSelectedGroupId(String(groups[0].groupId));
          return;
        }

        setSelectedGroupId('');
      } catch (err) {
        setTcgGroups([]);
        setSelectedGroupId('');
        setSelectorError(err.message || 'Error al cargar grupos TCG');
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, [selectedCategoryId]);

  const canSubmit = useMemo(
    () => Boolean(file && selectedCategoryId && selectedGroupId && !loadingCategories && !loadingGroups),
    [file, selectedCategoryId, selectedGroupId, loadingCategories, loadingGroups]
  );

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
    if (!selectedCategoryId || !selectedGroupId) {
      setError('Selecciona categoría y grupo TCG antes de importar');
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', String(dryRun));
      formData.append('stockMode', stockMode);
      formData.append('categoryId', String(selectedCategoryId));
      formData.append('groupId', String(selectedGroupId));

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
    if (!selectedCategoryId || !selectedGroupId) {
      setError('Selecciona categoría y grupo para descargar el template');
      return;
    }

    setError(null);

    try {
      await downloadTcgBulkTemplateCsv(selectedCategoryId, selectedGroupId);
    } catch (err) {
      setError(err.message || 'Error al generar template dinámico');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2><span className="material-symbols-outlined" style={{ fontSize: 24, verticalAlign: 'middle' }}>inventory_2</span> Carga Masiva TCG (Riftbound)</h2>
        <p>Selecciona categoría y grupo TCG para importar stock Normal/Foil</p>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.selectorSection}>
          <div className={styles.selectorGrid}>
            <div className={styles.selectorField}>
              <label htmlFor="tcg-category-select">Categoría TCG</label>
              <select
                id="tcg-category-select"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={loadingCategories}
                className={styles.selectorInput}
              >
                <option value="">
                  {loadingCategories ? 'Cargando categorías...' : 'Selecciona una categoría'}
                </option>
                {tcgCategories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.displayName || category.name} ({category.categoryId})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.selectorField}>
              <label htmlFor="tcg-group-select">Grupo / Set TCG</label>
              <select
                id="tcg-group-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={!selectedCategoryId || loadingGroups}
                className={styles.selectorInput}
              >
                <option value="">
                  {loadingGroups
                    ? 'Cargando grupos...'
                    : !selectedCategoryId
                      ? 'Primero selecciona categoría'
                      : 'Selecciona un grupo'}
                </option>
                {tcgGroups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.name} ({group.groupId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className={styles.selectionHint}>
            Integración seleccionada: categoría {selectedCategoryId || '-'} / grupo {selectedGroupId || '-'}
          </p>
        </div>

        <div className={styles.fileInput}>
          <label htmlFor="csv-file" className={styles.fileLabel}>
            <span className={styles.fileIcon}><span className="material-symbols-outlined">folder_open</span></span>
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
            <p><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>description</span> Archivo seleccionado: <strong>{file.name}</strong></p>
            <p><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>bar_chart</span> Tamaño: {(file.size / 1024).toFixed(2)} KB</p>
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

          <label className={styles.dryRunOption}>
            <input
              type="checkbox"
              checked={stockMode === 'increment'}
              onChange={(e) => setStockMode(e.target.checked ? 'increment' : 'replace')}
            />
            Sumar al stock existente (si no, reemplaza)
          </label>

          <button
            onClick={handleUpload}
            disabled={!canSubmit || uploading}
            className={styles.uploadButton}
          >
            {uploading
              ? 'Procesando...'
              : dryRun
                ? 'Validar CSV'
                : 'Importar Stock'}
          </button>

          <button
            onClick={downloadTemplate}
            disabled={!selectedCategoryId || !selectedGroupId}
            className={styles.templateButton}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>download</span> Descargar Template
          </button>
        </div>
      </div>

      {selectorError && (
        <div className={styles.error}>
          <h3><span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', color: '#ef4444' }}>error</span> Error de integración TCG</h3>
          <p>{selectorError}</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <h3><span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', color: '#ef4444' }}>error</span> Error</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className={styles.results}>
          <h3><span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', color: '#10b981' }}>check_circle</span> Resultado del Proceso</h3>
          
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
              <h4><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', color: '#10b981' }}>check_circle</span> Productos Creados</h4>
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
              <h4><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', color: '#3b82f6' }}>sync</span> Productos Actualizados</h4>
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
              <h4><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', color: '#ef4444' }}>error</span> Cartas No Encontradas en TCG</h4>
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
              <h4><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', color: '#f59e0b' }}>warning</span> Warnings</h4>
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
        <h3><span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle' }}>list_alt</span> Instrucciones</h3>
        <ul>
          <li>Usa el template dinámico (Nombre, Variante, Stock, TCG Product ID)</li>
          <li>Primero selecciona categoría y grupo TCG para habilitar template/importación</li>
          <li>El template incluye todas las cartas del grupo y sus variantes disponibles</li>
          <li>Primero ejecuta dry run para revisar no encontrados y warnings</li>
          <li>Normal y Foil se guardan como productos separados</li>
          <li>El endpoint usa los IDs seleccionados para categoría y grupo</li>
          <li>El upsert se hace por tcg_product_id + tcg_sub_type_name</li>
        </ul>
      </div>
    </div>
  );
}