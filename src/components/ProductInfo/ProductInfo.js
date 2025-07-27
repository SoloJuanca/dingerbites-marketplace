'use client';

import { useState, useEffect } from 'react';
import Icon from '../Icon/Icon';
import styles from './ProductInfo.module.css';

export default function ProductInfo({ product }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatPrice = (price) => {
    if (!isClient) return `$${price.toFixed(2)}`;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  return (
    <div className={styles.productInfo}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.price}>{formatPrice(product.price)}</p>
        </div>
        <div className={styles.badgeSection}>
          <span className={styles.categoryBadge}>
            {getCategoryLabel(product.category)}
          </span>
          <span className={styles.brandBadge}>
            {product.brand}
          </span>
        </div>
      </div>

      <div className={styles.description}>
        <h3 className={styles.sectionTitle}>Descripción</h3>
        <p className={styles.descriptionText}>
          {product.description}
        </p>
      </div>

      <div className={styles.features}>
        <h3 className={styles.sectionTitle}>Características</h3>
        <div className={styles.featuresList}>
          {getProductFeatures(product).map((feature, index) => (
            <div key={index} className={styles.featureItem}>
              <Icon name="check_circle" size={20} className={styles.featureIcon} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.details}>
        <h3 className={styles.sectionTitle}>Detalles del producto</h3>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Marca:</span>
            <span className={styles.detailValue}>{product.brand}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Categoría:</span>
            <span className={styles.detailValue}>{getCategoryLabel(product.category)}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Fecha de agregado:</span>
            <span className={styles.detailValue}>{formatDate(product.createdAt, isClient)}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>ID del producto:</span>
            <span className={styles.detailValue}>#{product.id.toString().padStart(6, '0')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCategoryLabel(category) {
  const categoryLabels = {
    'esmaltes': 'Esmaltes',
    'herramientas': 'Herramientas',
    'productos-artificiales': 'Productos para Uñas Artificiales',
    'cuidado-unas': 'Cuidado de Uñas'
  };
  return categoryLabels[category] || category;
}

function getProductFeatures(product) {
  const baseFeatures = [
    'Producto de alta calidad',
    'Fácil aplicación',
    'Larga duración'
  ];

  switch (product.category) {
    case 'esmaltes':
      return [
        ...baseFeatures,
        'Secado rápido',
        'Color vibrante',
        'Sin formaldehído',
        'Fórmula vegana'
      ];
    case 'herramientas':
      return [
        'Material profesional',
        'Ergonómico',
        'Fácil de limpiar',
        'Duradero',
        'Apto para uso profesional'
      ];
    case 'productos-artificiales':
      return [
        ...baseFeatures,
        'Compatible con UV/LED',
        'Adhesión superior',
        'Resistente al agua',
        'Acabado profesional'
      ];
    case 'cuidado-unas':
      return [
        'Ingredientes naturales',
        'Hidratante',
        'Fortalece las uñas',
        'Absorción rápida',
        'Sin parabenos'
      ];
    default:
      return baseFeatures;
  }
}

function formatDate(dateString, isClient = true) {
  if (!isClient) return new Date(dateString).toLocaleDateString();
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
} 