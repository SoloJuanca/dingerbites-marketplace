'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { useWishlist } from '../../lib/WishlistContext';
import Icon from '../Icon/Icon';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCartWithSync } = useCart();
  const { user, apiRequest, isAuthenticated } = useAuth();
  const { isInWishlist, addToWishlistWithSync, removeFromWishlistWithSync } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isWishlistToggling, setIsWishlistToggling] = useState(false);

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
    await addToCartWithSync({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image
    }, user, apiRequest);

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      setIsAdding(false);
    }, 600);
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para agregar productos a tu lista de deseos');
      return;
    }

    setIsWishlistToggling(true);
    
    const productInWishlist = isInWishlist(product.id);
    
    try {
      if (productInWishlist) {
        const result = await removeFromWishlistWithSync(product.id, user, apiRequest);
        if (result.success) {
          toast.success('Producto removido de tu lista de deseos');
        } else {
          toast.error(result.error || 'Error al remover de la lista de deseos');
        }
      } else {
        const result = await addToWishlistWithSync({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image
        }, user, apiRequest);
        if (result.success) {
          toast.success('Producto agregado a tu lista de deseos');
        } else {
          toast.error(result.error || 'Error al agregar a la lista de deseos');
        }
      }
    } catch (error) {
      toast.error('Error inesperado. Intenta nuevamente.');
    }
    
    setIsWishlistToggling(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <Link href={`/catalog/${product.slug}`} className={styles.imageWrapper}>
          <Image
            src={product.image}
            alt={product.name}
            width={280}
            height={200}
            className={styles.image}
          />
        </Link>
        <button 
          className={`${styles.wishlistBtn} ${isInWishlist(product.id) ? styles.wishlistActive : ''}`}
          onClick={handleWishlistToggle}
          disabled={isWishlistToggling}
          title={isInWishlist(product.id) ? 'Remover de lista de deseos' : 'Agregar a lista de deseos'}
        >
          <Icon 
            name={isInWishlist(product.id) ? 'favorite' : 'favorite_border'} 
            size={20} 
          />
        </button>
      </div>
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