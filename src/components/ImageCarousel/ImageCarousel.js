'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import styles from './ImageCarousel.module.css';

function normalizeImageUrl(image) {
  if (!image) return '';
  return typeof image === 'string' ? image : image.url || '';
}

function getTcgImageUrl(imageUrl) {
  if (!imageUrl || !imageUrl.includes('tcgplayer-cdn.tcgplayer.com/product/')) {
    return imageUrl;
  }

  return imageUrl.replace('_200w.jpg', '_400w.jpg');
}

export default function ImageCarousel({
  images,
  productName,
  isTcgProduct = false,
  productId = null
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageList, setImageList] = useState([]);
  const [imageFailed, setImageFailed] = useState(false);
  const refreshAttemptedRef = useRef(false);

  useEffect(() => {
    const nextList = (Array.isArray(images) ? images : [images])
      .map(normalizeImageUrl)
      .filter(Boolean)
      .map((image) => (isTcgProduct ? getTcgImageUrl(image) : image));
    setImageList(nextList);
    setCurrentIndex(0);
    setImageFailed(false);
    refreshAttemptedRef.current = false;
  }, [images, isTcgProduct]);

  const currentImage = imageList[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
    setImageFailed(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
    setImageFailed(false);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setImageFailed(false);
  };

  const handleImageError = async () => {
    if (refreshAttemptedRef.current) {
      setImageFailed(true);
      return;
    }
    refreshAttemptedRef.current = true;

    if (!isTcgProduct || !productId) {
      setImageFailed(true);
      return;
    }

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/refresh-image`, {
        method: 'POST'
      });
      const data = await response.json().catch(() => ({}));
      const nextImage = typeof data?.image === 'string' ? data.image.trim() : '';
      if (data?.refreshed && nextImage) {
        const upgraded = getTcgImageUrl(nextImage);
        setImageList((prev) => {
          if (prev.length === 0) return [upgraded];
          const copy = [...prev];
          copy[currentIndex] = upgraded;
          return copy;
        });
        setImageFailed(false);
        return;
      }
      setImageFailed(true);
    } catch {
      setImageFailed(true);
    }
  };

  if (imageList.length === 0 || imageFailed) {
    return (
      <div className={styles.carousel}>
        <div className={styles.placeholder}>
          <Icon name="image" size={64} />
          <span>Sin imagen disponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.carousel}>
      <div className={`${styles.mainImageContainer} ${isTcgProduct ? styles.tcgMainImageContainer : ''}`}>
        <Image
          src={currentImage}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          width={600}
          height={400}
          className={`${styles.mainImage} ${isTcgProduct ? styles.tcgMainImage : ''}`}
          priority={currentIndex === 0}
          sizes="(max-width: 480px) calc(100vw - 64px), (max-width: 768px) calc(100vw - 80px), (max-width: 1024px) calc(100vw - 96px), 760px"
          onError={handleImageError}
        />
        
        {imageList.length > 1 && (
          <>
            <button 
              className={`${styles.navButton} ${styles.prevButton}`}
              onClick={goToPrevious}
              aria-label="Imagen anterior"
            >
              <Icon name="chevron_left" size={24} />
            </button>
            
            <button 
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={goToNext}
              aria-label="Imagen siguiente"
            >
              <Icon name="chevron_right" size={24} />
            </button>

            <div className={styles.indicators}>
              {imageList.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicator} ${
                    index === currentIndex ? styles.active : ''
                  }`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Ir a imagen ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {imageList.length > 1 && (
        <div className={styles.thumbnails}>
          {imageList.map((image, index) => (
            <button
              key={index}
              className={`${styles.thumbnail} ${
                index === currentIndex ? styles.activeThumbnail : ''
              }`}
              onClick={() => goToSlide(index)}
            >
              <Image
                src={image}
                alt={`${productName} - Miniatura ${index + 1}`}
                width={80}
                height={80}
                className={`${styles.thumbnailImage} ${isTcgProduct ? styles.thumbnailContain : ''}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
