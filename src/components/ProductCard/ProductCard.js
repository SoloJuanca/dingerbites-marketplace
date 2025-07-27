'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '../../lib/CartContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = async () => {
    setIsAdding(true);
    
    // Agregar al carrito
    addToCart({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image
    });

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      setIsAdding(false);
    }, 600);
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        <Image
          src={product.image}
          alt={product.name}
          width={280}
          height={200}
          className={styles.image}
        />
      </div>
      <div className={styles.content}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.description}>{product.description}</p>
        <div className={styles.footer}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          <button 
            className={`${styles.addBtn} ${isAdding ? styles.adding : ''}`}
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            {isAdding ? '✓ Agregado' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
} 