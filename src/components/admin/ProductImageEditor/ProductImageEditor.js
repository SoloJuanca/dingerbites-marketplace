'use client';

import { useState, useRef, useCallback } from 'react';
import styles from './ProductImageEditor.module.css';

/**
 * ProductImageEditor: reorder images (up/down) and crop per image.
 * images: [{ url, alt }]
 * onImagesChange: (newImages) => void
 * onUploadCrop: (blob) => Promise<{ url }> - upload cropped blob and return new url
 */
export default function ProductImageEditor({ images = [], onImagesChange, onUploadCrop, disabled = false }) {
  const [cropModal, setCropModal] = useState(null); // { index, url }
  const [zoom, setZoom] = useState(1);
  const [cropImageLoaded, setCropImageLoaded] = useState(false);
  const [cropApplying, setCropApplying] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const moveUp = (index) => {
    if (index <= 0) return;
    const next = [...images];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onImagesChange(next);
  };

  const moveDown = (index) => {
    if (index >= images.length - 1) return;
    const next = [...images];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onImagesChange(next);
  };

  const remove = (index) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const openCrop = (index, url) => {
    setCropModal({ index, url });
    setZoom(1);
    setCropImageLoaded(false);
  };

  const closeCrop = () => {
    setCropModal(null);
    setCropApplying(false);
  };

  const applyCrop = useCallback(async () => {
    if (!cropModal || !imgRef.current || !onUploadCrop) {
      closeCrop();
      return;
    }
    const img = imgRef.current;
    if (!img.complete || !img.naturalWidth) return;
    setCropApplying(true);
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    const srcSize = Math.round(size / zoom);
    const x = Math.round((img.naturalWidth - srcSize) / 2);
    const y = Math.round((img.naturalHeight - srcSize) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, x, y, srcSize, srcSize, 0, 0, size, size);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          onUploadCrop(blob)
            .then((result) => {
              const next = [...images];
              next[cropModal.index] = { url: result.url, alt: next[cropModal.index]?.alt || 'Imagen' };
              onImagesChange(next);
              closeCrop();
              resolve();
            })
            .catch((err) => {
              setCropApplying(false);
              reject(err);
            });
        },
        'image/jpeg',
        0.92
      );
    });
  }, [cropModal, zoom, images, onImagesChange, onUploadCrop]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.list}>
        {images.map((image, index) => (
          <div key={`${image.url}-${index}`} className={styles.item}>
            {index === 0 && <span className={styles.primaryBadge}>Principal</span>}
            <img src={image.url} alt={image.alt || ''} className={styles.thumb} />
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={disabled || index === 0}
                className={styles.btn}
                title="Mover antes"
                aria-label="Mover imagen antes"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={disabled || index === images.length - 1}
                className={styles.btn}
                title="Mover después"
                aria-label="Mover imagen después"
              >
                ↓
              </button>
              {onUploadCrop && (
                <button
                  type="button"
                  onClick={() => openCrop(index, image.url)}
                  disabled={disabled}
                  className={styles.btn}
                  title="Recortar"
                  aria-label="Recortar imagen"
                >
                  ✂
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                className={styles.btnDanger}
                title="Eliminar"
                aria-label="Eliminar imagen"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {cropModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="crop-title">
          <div className={styles.modal}>
            <h3 id="crop-title" className={styles.modalTitle}>Recortar imagen (centro, 1:1)</h3>
            <div className={styles.cropArea}>
              <div className={styles.cropPreview}>
                <img
                  ref={imgRef}
                  src={cropModal.url}
                  alt="Recortar"
                  crossOrigin="anonymous"
                  onLoad={() => {
                    setCropImageLoaded(true);
                    setZoom(1);
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    transform: `scale(${zoom})`
                  }}
                />
              </div>
              <div className={styles.zoomControl}>
                <label htmlFor="crop-zoom">Zoom:</label>
                <input
                  id="crop-zoom"
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
                <span>{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={closeCrop} disabled={cropApplying} className={styles.btnSecondary}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyCrop}
                disabled={!cropImageLoaded || cropApplying}
                className={styles.btnPrimary}
              >
                {cropApplying ? 'Subiendo...' : 'Aplicar recorte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
