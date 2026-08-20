'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { useWishlist } from '../../lib/WishlistContext';
import { getTcgMinPriceForSubType } from '../../lib/currency';
import { trackSelectItem } from '../../lib/analytics';
import Icon from '../Icon/Icon';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCartWithSync, getCartQuantityByProductId } = useCart();
  const { user, apiRequest, isAuthenticated } = useAuth();
  const { isInWishlist, addToWishlistWithSync, removeFromWishlistWithSync } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isWishlistToggling, setIsWishlistToggling] = useState(false);
  const [imageSrc, setImageSrc] = useState(product.image || '');
  const [imageFailed, setImageFailed] = useState(false);
  const [imageRefreshing, setImageRefreshing] = useState(false);
  const imageRefreshAttemptedRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setImageSrc(product.image || '');
    setImageFailed(false);
    imageRefreshAttemptedRef.current = false;
  }, [product.id, product.image]);

  const isTcgProduct =
    Boolean(product.tcg_product_id) ||
    Boolean(product.tcg_category_id) ||
    product.category_slug === 'tcg';

  const handleImageError = async () => {
    if (imageRefreshAttemptedRef.current) {
      setImageFailed(true);
      return;
    }
    imageRefreshAttemptedRef.current = true;

    if (!isTcgProduct || !product.id) {
      setImageFailed(true);
      return;
    }

    try {
      setImageRefreshing(true);
      const response = await fetch(`/api/products/${encodeURIComponent(product.id)}/refresh-image`, {
        method: 'POST'
      });
      const data = await response.json().catch(() => ({}));
      const nextImage = typeof data?.image === 'string' ? data.image.trim() : '';
      if (data?.refreshed && nextImage && nextImage !== imageSrc) {
        setImageSrc(nextImage);
        setImageFailed(false);
        return;
      }
      setImageFailed(true);
    } catch {
      setImageFailed(true);
    } finally {
      setImageRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isTcgProduct || imageSrc || imageRefreshAttemptedRef.current) return;
    handleImageError();
  }, [isTcgProduct, imageSrc, product.id]);

  const formatPrice = (price) => {
    if (!isClient) return `$${Number(price).toFixed(2)}`;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const displayPrice =
    product.tcg_product_id || product.tcg_category_id || product.category_slug === 'tcg'
    ? Math.max(
      getTcgMinPriceForSubType(product.tcg_sub_type_name || 'Normal'),
      Number(product.price) || 0
    )
    : Number(product.price) || 0;
  const stockQuantity = Number(product.stock_quantity || 0);
  const inCartQuantity = getCartQuantityByProductId(product.id);
  const remainingStock = Math.max(0, stockQuantity - inCartQuantity);
  const isOutOfStock = stockQuantity <= 0;
  const isCartAtStockLimit = !isOutOfStock && remainingStock <= 0;
  const disableAddButton = isAdding || isOutOfStock || isCartAtStockLimit;

  const sanitizeHtml = (html) => {
    if (!html || typeof html !== 'string') return '';
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error('Este producto está sin stock');
      return;
    }
    if (isCartAtStockLimit) {
      toast.error(`Ya tienes el máximo disponible (${stockQuantity}) en el carrito`);
      return;
    }

    setIsAdding(true);
    
    try {
      // Agregar al carrito
      await addToCartWithSync({
        id: product.id,
        name: product.name,
        description: product.description,
        price: displayPrice,
        image: imageSrc || product.image,
        stock_quantity: stockQuantity
      }, user, apiRequest);

      // Mostrar mensaje de éxito
      toast.success('Producto agregado al carrito');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error al agregar producto al carrito');
    }

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      setIsAdding(false);
    }, 600);
  };

  const handleSelectItem = () => {
    trackSelectItem({
      id: product.id,
      name: product.name,
      price: displayPrice,
      category_id: product.category_id,
      category_name: product.category_name
    });
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
          price: displayPrice,
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
        <Link href={`/catalog/${product.slug}`} className={styles.imageWrapper} onClick={handleSelectItem}>
          {imageFailed || !imageSrc ? (
            <div className={styles.imagePlaceholder} aria-hidden>
              <Icon name="image" size={40} />
              {imageRefreshing ? <span className={styles.imagePlaceholderText}>Actualizando…</span> : null}
            </div>
          ) : (
            <Image
              src={imageSrc}
              alt={product.name}
              width={280}
              height={200}
              className={styles.image}
              onError={handleImageError}
            />
          )}
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
        <Link href={`/catalog/${product.slug}`} className={styles.nameLink} onClick={handleSelectItem}>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>
        <div className={styles.footer}>
          <span className={styles.price}>
            {(product.category_slug === 'tcg')
              ? ''
              : formatPrice(displayPrice)}
          </span>
          <button 
            className={`${styles.addBtn} ${isAdding ? styles.adding : ''}`}
            onClick={handleAddToCart}
            disabled={disableAddButton}
          >
            {isOutOfStock ? 'Sin stock' : isCartAtStockLimit ? 'Máximo en carrito' : isAdding ? 'Agregado' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
} 