'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SmartComboBox from '../SmartComboBox/SmartComboBox';
import { downloadTcgBulkTemplateCsv } from '../../../lib/tcgBulkTemplateDownload';
import styles from './TcgProductSelector.module.css';

const TCG_BASE = '/api/tcg';

export default function TcgProductSelector({
  tcgCategoryId,
  formData,
  onSelect,
  disabled = false
}) {
  const [tcgCategories, setTcgCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState(null);

  const resolvedCategoryId = tcgCategoryId || formData.tcg_category_id;

  useEffect(() => {
    if (!tcgCategoryId) {
      fetch(`${TCG_BASE}/categories`)
        .then((r) => r.json())
        .then((d) => setTcgCategories(d.results || []))
        .catch(() => setTcgCategories([]));
    } else {
      setTcgCategories([]);
    }
  }, [tcgCategoryId]);

  useEffect(() => {
    if (!resolvedCategoryId) {
      setGroups([]);
      return;
    }
    setLoading(true);
    fetch(`${TCG_BASE}/${resolvedCategoryId}/groups`)
      .then((r) => r.json())
      .then((d) => {
        setGroups(d.results || []);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [resolvedCategoryId]);

  useEffect(() => {
    if (!resolvedCategoryId || !formData.tcg_group_id) {
      setProducts([]);
      return;
    }
    setLoading(true);
    fetch(`${TCG_BASE}/${resolvedCategoryId}/${formData.tcg_group_id}/products`)
      .then((r) => r.json())
      .then((d) => setProducts(d.results || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [resolvedCategoryId, formData.tcg_group_id]);

  useEffect(() => {
    if (!resolvedCategoryId || !formData.tcg_group_id) {
      setPrices([]);
      return;
    }
    fetch(`${TCG_BASE}/${resolvedCategoryId}/${formData.tcg_group_id}/prices`)
      .then((r) => r.json())
      .then((d) => setPrices(d.results || []))
      .catch(() => setPrices([]));
  }, [resolvedCategoryId, formData.tcg_group_id]);

  const subTypesForProduct = formData.tcg_product_id
    ? [...new Set(
        prices
          .filter((p) => p.productId === formData.tcg_product_id)
          .map((p) => p.subTypeName || 'Normal')
      )]
    : [];

  const selectedPrice = prices.find(
    (p) =>
      p.productId === formData.tcg_product_id &&
      (p.subTypeName || 'Normal') === (formData.tcg_sub_type_name || 'Normal')
  );

  const handleCategoryChange = (value) => {
    const tcgCatId = value ? Number(value) : null;
    onSelect({
      tcg_category_id: tcgCatId,
      tcg_group_id: null,
      tcg_product_id: null,
      tcg_sub_type_name: null,
      name: '',
      description: '',
      images: [],
      price: ''
    });
  };

  const handleGroupChange = (value) => {
    const v = value ? Number(value) : null;
    onSelect({
      tcg_group_id: v,
      tcg_category_id: resolvedCategoryId ?? formData.tcg_category_id ?? null,
      tcg_product_id: null,
      tcg_sub_type_name: null,
      name: '',
      description: '',
      images: [],
      price: ''
    });
  };

  const convertUsdToMxnAndApplyMin = async (usd, subTypeName = 'Normal') => {
    if (usd == null || usd === '' || Number.isNaN(Number(usd))) return '';
    try {
      const res = await fetch(
        `/api/tcg/convert-price?usd=${encodeURIComponent(usd)}&subTypeName=${encodeURIComponent(subTypeName || 'Normal')}`
      );
      const data = await res.json();
      return data.mxn != null ? String(data.mxn) : '';
    } catch {
      return '';
    }
  };

  const handleProductChange = async (value) => {
    const productId = value ? Number(value) : null;
    const product = products.find((p) => p.productId === productId);
    const firstSubType = productId
      ? (prices.find((p) => p.productId === productId)?.subTypeName || 'Normal')
      : null;
    const firstPriceRow = productId
      ? prices.find(
          (p) => p.productId === productId && (p.subTypeName || 'Normal') === (firstSubType || 'Normal')
        )
      : null;
    const usd = firstPriceRow?.marketPrice ?? firstPriceRow?.midPrice;
    const priceMxn = await convertUsdToMxnAndApplyMin(usd, firstSubType || 'Normal');

    onSelect({
      tcg_product_id: productId,
      tcg_group_id: formData.tcg_group_id ?? null,
      tcg_category_id: resolvedCategoryId ?? formData.tcg_category_id ?? null,
      tcg_sub_type_name: firstSubType,
      name: product?.name || '',
      description: extendedDataToDescription(product?.extendedData || []),
      images: product?.imageUrl ? [{ url: product.imageUrl }] : [],
      price: priceMxn
    });
  };

  const handleSubTypeChange = async (value) => {
    const v = value || null;
    const priceRow = prices.find(
      (p) => p.productId === formData.tcg_product_id && (p.subTypeName || 'Normal') === (v || 'Normal')
    );
    const usd = priceRow?.marketPrice ?? priceRow?.midPrice;
    const priceMxn = await convertUsdToMxnAndApplyMin(usd, v || 'Normal');

    onSelect({
      tcg_sub_type_name: v || null,
      price: priceMxn
    });
  };

  const handleStockChange = (e) => {
    onSelect({ stock_quantity: e.target.value });
  };

  const handleDownloadBulkTemplate = async () => {
    if (!resolvedCategoryId || !formData.tcg_group_id) return;
    setTemplateError(null);
    setTemplateLoading(true);
    try {
      await downloadTcgBulkTemplateCsv(resolvedCategoryId, formData.tcg_group_id);
    } catch (err) {
      setTemplateError(err.message || 'No se pudo generar el template');
    } finally {
      setTemplateLoading(false);
    }
  };

  function extendedDataToDescription(extData) {
    if (!Array.isArray(extData) || extData.length === 0) return '';
    return extData
      .map((x) => `${x.displayName || x.name}: ${x.value || ''}`)
      .join('\n');
  }

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Selección de producto TCG</h4>

      {!tcgCategoryId && (
        <div className={styles.field}>
          <label>Categoría TCG (API)</label>
          <SmartComboBox
            value={formData.tcg_category_id || ''}
            onChange={handleCategoryChange}
            options={tcgCategories.map((c) => ({
              id: c.categoryId,
              name: c.displayName || c.name
            }))}
            placeholder="Buscar o seleccionar categoría..."
            disabled={disabled}
          />
        </div>
      )}

      {resolvedCategoryId && (
        <div className={styles.field}>
          <label>Set / Grupo</label>
          <SmartComboBox
            value={formData.tcg_group_id || ''}
            onChange={handleGroupChange}
            options={groups.map((g) => ({
              id: g.groupId,
              name: `${g.name}${g.abbreviation ? ` (${g.abbreviation})` : ''}`
            }))}
            placeholder="Buscar o seleccionar set..."
            disabled={disabled || loading}
          />
        </div>
      )}

      {resolvedCategoryId && formData.tcg_group_id && (
        <div className={styles.bulkSection} role="region" aria-label="Carga masiva TCG">
          <p className={styles.bulkSectionTitle}>Carga masiva del set</p>
          <p className={styles.bulkSectionText}>
            Descarga el CSV con todas las cartas y variantes de este grupo. Complétalo y súbelo desde{' '}
            <strong>Productos → Carga masiva TCG</strong> (misma categoría y grupo).
          </p>
          <div className={styles.bulkSectionActions}>
            <button
              type="button"
              className={styles.templateButton}
              onClick={handleDownloadBulkTemplate}
              disabled={disabled || templateLoading}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>
                download
              </span>
              {templateLoading ? 'Generando…' : 'Descargar template CSV'}
            </button>
            <Link href="/admin/products" className={styles.bulkAdminLink}>
              Ir a carga masiva
            </Link>
          </div>
          {templateError && <p className={styles.bulkError}>{templateError}</p>}
        </div>
      )}

      {resolvedCategoryId && formData.tcg_group_id && (
        <div className={styles.field}>
          <label>Producto</label>
          <SmartComboBox
            value={formData.tcg_product_id || ''}
            onChange={handleProductChange}
            options={products.map((p) => ({
              id: p.productId,
              name: p.name
            }))}
            placeholder="Buscar o seleccionar producto..."
            disabled={disabled || loading}
          />
        </div>
      )}

      {formData.tcg_product_id && subTypesForProduct.length > 1 && (
        <div className={styles.field}>
          <label>Variante</label>
          <SmartComboBox
            value={formData.tcg_sub_type_name || 'Normal'}
            onChange={handleSubTypeChange}
            options={subTypesForProduct.map((st) => ({ id: st, name: st }))}
            placeholder="Buscar o seleccionar variante..."
            disabled={disabled}
          />
        </div>
      )}

      {formData.tcg_product_id && formData.price && (
        <div className={styles.field}>
          <label>Precio base (MXN)</label>
          <div className={styles.priceDisplay}>
            ${Number(formData.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <small className={styles.helpText}>Precio de mercado convertido con mínimo configurable por variante.</small>
        </div>
      )}

      {formData.tcg_product_id && (
        <div className={styles.field}>
          <label>Stock</label>
          <input
            type="number"
            min="0"
            value={formData.stock_quantity ?? ''}
            onChange={handleStockChange}
            disabled={disabled}
            className={styles.input}
            placeholder="Cantidad en inventario"
          />
        </div>
      )}
    </div>
  );
}
