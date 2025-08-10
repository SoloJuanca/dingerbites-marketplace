'use client';

import { useState, useEffect } from 'react';
import Icon from '../Icon/Icon';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { getProductRatingStats } from '../../lib/reviews';
import styles from './ProductSummary.module.css';

export default function ProductSummary({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { addToCartWithSync } = useCart();
  const { user, apiRequest } = useAuth();
  const [ratingStats, setRatingStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: [0, 0, 0, 0, 0]
  });

  useEffect(() => {
    setIsClient(true);
    if (product.id) {
      setRatingStats(getProductRatingStats(product.id));
    }
  }, [product.id]);

  const formatPrice = (price) => {
    if (!isClient) return `$${price.toFixed(2)}`;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    
    // Add the quantity as individual items
    for (let i = 0; i < quantity; i++) {
      await addToCartWithSync({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image || (product.images && product.images.length > 0 ? product.images[0] : null)
      }, user, apiRequest);
    }
    
    // Simular feedback visual
    setTimeout(() => {
      setIsAddingToCart(false);
    }, 1000);
  };

  const handleBuyNow = async () => {
    // Add the quantity as individual items
    for (let i = 0; i < quantity; i++) {
      await addToCartWithSync({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image || (product.images && product.images.length > 0 ? product.images[0] : null)
      }, user, apiRequest);
    }
    // Aquí iría la navegación al checkout
    window.location.href = '/cart';
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Icon
        key={index}
        name="star"
        size={16}
        className={`${styles.star} ${index < rating ? styles.filled : styles.empty}`}
      />
    ));
  };

  return (
    <div className={styles.summary}>
      <div className={styles.header}>
        <h2 className={styles.title}>{product.name}</h2>
        <div className={styles.brand}>{product.brand}</div>
      </div>

      <div className={styles.pricing}>
        <div className={styles.price}>{formatPrice(product.price)}</div>
        <div className={styles.priceUnit}>por unidad</div>
      </div>

      {ratingStats.totalReviews > 0 && (
        <div className={styles.rating}>
          <div className={styles.stars}>
            {renderStars(Math.round(ratingStats.averageRating))}
          </div>
          <span className={styles.ratingText}>
            {ratingStats.averageRating} ({ratingStats.totalReviews} reseña{ratingStats.totalReviews !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      <div className={styles.stock}>
        <Icon name="check_circle" size={16} className={styles.stockIcon} />
        <span>En stock - Envío inmediato</span>
      </div>

      <div className={styles.quantity}>
        <label className={styles.quantityLabel}>Cantidad:</label>
        <div className={styles.quantityControls}>
          <button
            className={styles.quantityBtn}
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Disminuir cantidad"
          >
            <Icon name="remove" size={16} />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            className={styles.quantityInput}
            min="1"
            max="10"
          />
          <button
            className={styles.quantityBtn}
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= 10}
            aria-label="Aumentar cantidad"
          >
            <Icon name="add" size={16} />
          </button>
        </div>
      </div>

      <div className={styles.totalPrice}>
        <span className={styles.totalLabel}>Total:</span>
        <span className={styles.totalAmount}>
          {formatPrice(product.price * quantity)}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.addToCartBtn}
          onClick={handleAddToCart}
          disabled={isAddingToCart}
        >
          {isAddingToCart ? (
            <>
              <Icon name="check" size={20} />
              Agregado
            </>
          ) : (
            <>
              <Icon name="shopping_cart" size={20} />
              Agregar al carrito
            </>
          )}
        </button>
        
        <button
          className={styles.buyNowBtn}
          onClick={handleBuyNow}
        >
          <Icon name="flash_on" size={20} />
          Comprar ahora
        </button>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <Icon name="local_shipping" size={20} className={styles.featureIcon} />
          <div className={styles.featureText}>
            <strong>Envío gratis</strong>
            <span>En pedidos mayores a $500</span>
          </div>
        </div>
        
        <div className={styles.feature}>
          <Icon name="autorenew" size={20} className={styles.featureIcon} />
          <div className={styles.featureText}>
            <strong>Devoluciones</strong>
            <span>30 días para cambios</span>
          </div>
        </div>
        
        <div className={styles.feature}>
          <Icon name="verified_user" size={20} className={styles.featureIcon} />
          <div className={styles.featureText}>
            <strong>Garantía</strong>
            <span>Producto 100% original</span>
          </div>
        </div>
      </div>

      {/*
      <div className={styles.help}>
        <h4 className={styles.helpTitle}>¿Necesitas ayuda?</h4>
        <div className={styles.helpOptions}>
          <button className={styles.helpBtn}>
            <Icon name="chat" size={16} />
            Chat en vivo
          </button>
          <button className={styles.helpBtn}>
            <Icon name="call" size={16} />
            Llamar
          </button>
        </div>
      </div>
      */}
    </div>
  );
} 