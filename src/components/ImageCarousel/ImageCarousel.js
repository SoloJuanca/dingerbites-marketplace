'use client';

import { useState } from 'react';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import styles from './ImageCarousel.module.css';

export default function ImageCarousel({ images, productName }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const imageList = Array.isArray(images) ? images : [images];

  const goToPrevious = () => {
    setCurrentIndex(prev => 
      prev === 0 ? imageList.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(prev => 
      prev === imageList.length - 1 ? 0 : prev + 1
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  if (imageList.length === 0) {
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
      <div className={styles.mainImageContainer}>
        <Image
          src={imageList[currentIndex]}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          width={600}
          height={400}
          className={styles.mainImage}
          priority={currentIndex === 0}
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
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 