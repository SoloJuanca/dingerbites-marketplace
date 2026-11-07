'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import { isRiftboundProduct, RIFTBOUND_FALLBACK_IMAGE } from '../../lib/productImages';
import styles from './ProductImage.module.css';

export default function ProductImage({
  src,
  alt,
  width,
  height,
  className,
  product,
  isRiftbound,
  priority = false,
  sizes
}) {
  const riftbound = isRiftbound ?? isRiftboundProduct(product);
  const initialSrc = src || (riftbound ? RIFTBOUND_FALLBACK_IMAGE : '');
  const [imageSrc, setImageSrc] = useState(initialSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImageSrc(src || (riftbound ? RIFTBOUND_FALLBACK_IMAGE : ''));
    setFailed(false);
  }, [src, riftbound]);

  const handleError = () => {
    if (imageSrc === RIFTBOUND_FALLBACK_IMAGE || !riftbound) {
      setFailed(true);
      return;
    }
    setImageSrc(RIFTBOUND_FALLBACK_IMAGE);
  };

  if (!imageSrc || failed) {
    return (
      <span className={`${styles.unavailable} ${className || ''}`} role="img" aria-label="Imagen no disponible">
        <Icon name="image" size={24} aria-hidden />
      </span>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      onError={handleError}
    />
  );
}
