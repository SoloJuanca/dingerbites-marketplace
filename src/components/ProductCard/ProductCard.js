'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../lib/CartContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatPrice = (price) => {
    if (!isClient) return `$${price.toFixed(2)}`;
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
      <Link href={`/catalog/${product.slug}`} className={styles.imageWrapper}>
        <Image
          src={product.image}
          alt={product.name}
          width={280}
          height={200}
          className={styles.image}
        />
      </Link>
      <div className={styles.content}>
        <Link href={`/catalog/${product.slug}`} className={styles.nameLink}>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>
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