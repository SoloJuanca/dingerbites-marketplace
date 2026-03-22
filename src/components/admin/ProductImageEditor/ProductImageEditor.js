'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import styles from './ProductImageEditor.module.css';

function clampEdge(left, top, imgW, imgH, V) {
  const minL = Math.min(0, V - imgW);
  const maxL = Math.max(0, V - imgW);
  const minT = Math.min(0, V - imgH);
  const maxT = Math.max(0, V - imgH);
  return {
    left: Math.max(minL, Math.min(maxL, left)),
    top: Math.max(minT, Math.min(maxT, top))
  };
}

/** Pan offsets from centered “contain” position (viewport px). */
function clampPanOffsets(panX, panY, naturalSize, V, zoom) {
  const nw = naturalSize.w;
  const nh = naturalSize.h;
  const fitScale = Math.min(V / nw, V / nh);
  const scale = fitScale * Math.max(zoom, 0.01);
  const imgW = nw * scale;
  const imgH = nh * scale;
  const baseLeft = (V - imgW) / 2;
  const baseTop = (V - imgH) / 2;
  const { left, top } = clampEdge(baseLeft + panX, baseTop + panY, imgW, imgH, V);
  return { x: left - baseLeft, y: top - baseTop };
}

function getLayout(naturalSize, V, zoom, panX, panY) {
  const nw = naturalSize.w;
  const nh = naturalSize.h;
  const fitScale = Math.min(V / nw, V / nh);
  const scale = fitScale * Math.max(zoom, 0.01);
  const imgW = nw * scale;
  const imgH = nh * scale;
  const baseLeft = (V - imgW) / 2;
  const baseTop = (V - imgH) / 2;
  const { x, y } = clampPanOffsets(panX, panY, naturalSize, V, zoom);
  const { left, top } = clampEdge(baseLeft + x, baseTop + y, imgW, imgH, V);
  return { left, top, imgW, imgH, V, nw, nh, fitScale, scale };
}

/**
 * Renders exactly what the editor shows: square canvas, image with contain+zoom+pan, letterbox fill.
 * High-res export: outSide scales up from viewport while keeping the same framing.
 */
function drawEditorViewToCanvas(img, naturalSize, viewportV, zoom, panX, panY) {
  const layout = getLayout(naturalSize, viewportV, zoom, panX, panY);
  const { left, top, imgW, imgH, V, nw, nh } = layout;
  const outSide = Math.min(2048, Math.max(512, Math.round(Math.max(nw, nh))));
  const k = outSide / V;

  const canvas = document.createElement('canvas');
  canvas.width = outSide;
  canvas.height = outSide;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, outSide, outSide);
  ctx.drawImage(img, 0, 0, nw, nh, left * k, top * k, imgW * k, imgH * k);
  return canvas;
}

/**
 * ProductImageEditor: reorder images (up/down) and crop per image.
 * images: [{ url, alt }]
 * onImagesChange: (newImages) => void
 * onUploadCrop: (blob) => Promise<{ url }> - upload cropped blob and return new url
 */
export default function ProductImageEditor({ images = [], onImagesChange, onUploadCrop, disabled = false }) {
  const { apiRequest } = useAuth();
  const [cropModal, setCropModal] = useState(null); // { index, url }
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState(null); // { w, h } when img decoded
  const [cropApplying, setCropApplying] = useState(false);
  const [cropPreparing, setCropPreparing] = useState(false);
  const [cropWorkingUrl, setCropWorkingUrl] = useState(null);
  const [cropError, setCropError] = useState(null);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [viewportPx, setViewportPx] = useState(400);
  const imgRef = useRef(null);
  const viewportRef = useRef(null);
  const cropBlobRevokeRef = useRef(null);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });

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

  const closeCrop = useCallback(() => {
    if (cropBlobRevokeRef.current) {
      cropBlobRevokeRef.current();
      cropBlobRevokeRef.current = null;
    }
    setCropModal(null);
    setCropWorkingUrl(null);
    setCropPreparing(false);
    setCropApplying(false);
    setNaturalSize(null);
    setPreviewDataUrl(null);
    setCropError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const openCrop = (index, url) => {
    setCropModal({ index, url });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNaturalSize(null);
    setCropError(null);
    setPreviewDataUrl(null);
  };

  useEffect(() => {
    if (!cropModal) return undefined;

    let cancelled = false;

    const clearRevoke = () => {
      if (cropBlobRevokeRef.current) {
        cropBlobRevokeRef.current();
        cropBlobRevokeRef.current = null;
      }
    };

    setCropWorkingUrl(null);
    setCropPreparing(true);
    setCropError(null);

    const url = cropModal.url;

    if (url.startsWith('blob:') || url.startsWith('data:')) {
      clearRevoke();
      if (!cancelled) {
        setCropWorkingUrl(url);
        setCropPreparing(false);
      }
      return () => {
        cancelled = true;
      };
    }

    if (url.startsWith('https://storage.googleapis.com/')) {
      (async () => {
        try {
          const res = await apiRequest('/api/admin/fetch-image-for-crop', {
            method: 'POST',
            body: JSON.stringify({ url })
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'No se pudo cargar la imagen');
          }
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          clearRevoke();
          cropBlobRevokeRef.current = () => URL.revokeObjectURL(objectUrl);
          setCropWorkingUrl(objectUrl);
        } catch (e) {
          if (!cancelled) {
            setCropError(e.message || 'Error al preparar la imagen');
          }
        } finally {
          if (!cancelled) {
            setCropPreparing(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    clearRevoke();
    if (!cancelled) {
      setCropWorkingUrl(url);
      setCropPreparing(false);
    }
    return () => {
      cancelled = true;
    };
  }, [cropModal, apiRequest]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setViewportPx(w);
    });
    ro.observe(el);
    const w = el.clientWidth;
    if (w > 0) setViewportPx(w);
    return () => ro.disconnect();
  }, [cropWorkingUrl, cropPreparing, cropError]);

  useEffect(() => {
    if (!naturalSize || viewportPx < 8) return;
    setPan((p) => clampPanOffsets(p.x, p.y, naturalSize, viewportPx, zoom));
  }, [zoom, naturalSize, viewportPx]);

  useEffect(() => {
    if (!naturalSize || cropPreparing || !imgRef.current) {
      setPreviewDataUrl(null);
      return;
    }
    const img = imgRef.current;
    if (!img.naturalWidth || !img.naturalHeight) {
      setPreviewDataUrl(null);
      return;
    }
    try {
      const canvas = drawEditorViewToCanvas(img, naturalSize, viewportPx, zoom, pan.x, pan.y);
      if (!canvas) {
        setPreviewDataUrl(null);
        return;
      }
      setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.88));
    } catch {
      setPreviewDataUrl(null);
    }
  }, [naturalSize, zoom, pan.x, pan.y, cropWorkingUrl, cropPreparing, viewportPx]);

  const applyCrop = useCallback(async () => {
    if (!cropModal || !imgRef.current || !onUploadCrop) {
      closeCrop();
      return;
    }
    const img = imgRef.current;
    if (!img.complete || !img.naturalWidth || !naturalSize) return;
    setCropApplying(true);

    const canvas = drawEditorViewToCanvas(img, naturalSize, viewportPx, zoom, pan.x, pan.y);
    if (!canvas) {
      setCropApplying(false);
      return;
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setCropApplying(false);
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
  }, [cropModal, zoom, pan, naturalSize, viewportPx, images, onImagesChange, onUploadCrop, closeCrop]);

  const handleCropImageLoad = useCallback((e) => {
    const iw = e.target.naturalWidth;
    const ih = e.target.naturalHeight;
    setNaturalSize({ w: iw, h: ih });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePointerDown = useCallback(
    (ev) => {
      if (!naturalSize || cropPreparing) return;
      ev.preventDefault();
      ev.currentTarget.setPointerCapture(ev.pointerId);
      dragRef.current = { active: true, lastX: ev.clientX, lastY: ev.clientY };
    },
    [naturalSize, cropPreparing]
  );

  const handlePointerMove = useCallback(
    (ev) => {
      if (!dragRef.current.active || !viewportRef.current || !naturalSize) return;
      const V = viewportRef.current.clientWidth;
      if (V < 1) return;
      const dx = ev.clientX - dragRef.current.lastX;
      const dy = ev.clientY - dragRef.current.lastY;
      dragRef.current.lastX = ev.clientX;
      dragRef.current.lastY = ev.clientY;
      setPan((p) => clampPanOffsets(p.x + dx, p.y + dy, naturalSize, V, zoom));
    },
    [zoom, naturalSize]
  );

  const handlePointerUp = useCallback((ev) => {
    dragRef.current.active = false;
    try {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const cropLayout = useMemo(() => {
    if (!naturalSize || viewportPx < 8) return null;
    const { left, top, imgW, imgH } = getLayout(naturalSize, viewportPx, zoom, pan.x, pan.y);
    return { left, top, imgW, imgH };
  }, [naturalSize, viewportPx, zoom, pan.x, pan.y]);

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
            <h3 id="crop-title" className={styles.modalTitle}>
              Ajustar imagen (salida cuadrada)
            </h3>
            <p className={styles.modalHint}>
              Con zoom al 100% ves la foto completa dentro del cuadrado (como contain), con bandas si no es cuadrada.
              Sube el zoom para acercar y arrastra para encuadrar.
            </p>

            {cropError && (
              <p className={styles.cropError} role="alert">
                {cropError}
              </p>
            )}

            {!cropError && (
              <div className={styles.cropArea}>
                <div
                  ref={viewportRef}
                  className={styles.cropViewport}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  role="presentation"
                  aria-label="Área de encuadre: arrastra para mover la imagen"
                >
                  {cropPreparing && (
                    <div className={styles.cropSkeleton} aria-hidden>
                      <div className={styles.cropSkeletonInner}>
                        <span className={styles.cropSkeletonText}>Cargando imagen…</span>
                      </div>
                    </div>
                  )}
                  {!cropPreparing && cropWorkingUrl && !naturalSize && (
                    <div className={styles.cropSkeleton} aria-hidden>
                      <div className={styles.cropSkeletonInner}>
                        <span className={styles.cropSkeletonText}>Decodificando imagen…</span>
                      </div>
                    </div>
                  )}
                  {!cropPreparing && cropWorkingUrl && (
                    <div
                      className={styles.cropImageLayer}
                      style={
                        cropLayout
                          ? {
                              width: cropLayout.imgW,
                              height: cropLayout.imgH,
                              left: cropLayout.left,
                              top: cropLayout.top
                            }
                          : { visibility: 'hidden', left: 0, top: 0, width: 1, height: 1 }
                      }
                    >
                      <img
                        ref={imgRef}
                        key={cropWorkingUrl}
                        src={cropWorkingUrl}
                        alt=""
                        className={styles.cropSourceImg}
                        draggable={false}
                        onLoad={handleCropImageLoad}
                        onError={() => setCropError('No se pudo mostrar la imagen.')}
                      />
                    </div>
                  )}
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
                    disabled={!naturalSize || cropPreparing}
                  />
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
              </div>
            )}

            {previewDataUrl && !cropError && (
              <div className={styles.previewSection}>
                <h4 className={styles.previewTitle}>Vista previa (object-fit: contain)</h4>
                <p className={styles.previewIntro}>
                  Misma forma de mostrar la imagen en tarjeta de catálogo y en la ficha del producto.
                </p>
                <div className={styles.previewGrid}>
                  <div className={styles.previewCol}>
                    <p className={styles.previewLabel}>Tarjeta en listado</p>
                    <div className={styles.mockCard}>
                      <div className={styles.mockCardImage}>
                        <img src={previewDataUrl} alt="" className={styles.mockCardImg} />
                      </div>
                      <div className={styles.mockCardBody}>
                        <span className={styles.mockCardTitle}>Nombre del producto</span>
                        <span className={styles.mockCardPrice}>$000</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.previewCol}>
                    <p className={styles.previewLabel}>Ficha — imagen principal</p>
                    <div className={styles.mockPdp}>
                      <div className={styles.mockPdpImageWrap}>
                        <img src={previewDataUrl} alt="" className={styles.mockPdpImg} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              <button type="button" onClick={closeCrop} disabled={cropApplying} className={styles.btnSecondary}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await applyCrop();
                  } catch (e) {
                    toast.error(e?.message || 'Error al aplicar el recorte');
                  }
                }}
                disabled={!naturalSize || cropApplying || !!cropError || cropPreparing}
                className={styles.btnPrimary}
              >
                {cropApplying ? 'Subiendo...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
