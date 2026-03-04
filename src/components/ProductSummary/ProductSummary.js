'use client';

import { useState, useEffect } from 'react';
import Icon from '../Icon/Icon';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { getProductRatingStats } from '../../lib/reviews';
import styles from './ProductSummary.module.css';

export default function ProductSummary({ product, marketPriceMxn = null, isTcgProduct = false }) {
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
    if (price == null) return 'Consultar';
    if (!isClient) return `$${Number(price).toFixed(2)}`;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const TCG_MIN_MXN = 15;
  const displayPrice =
    isTcgProduct && marketPriceMxn != null
      ? Math.max(TCG_MIN_MXN, marketPriceMxn)
      : isTcgProduct && (product.price != null && product.price > 0)
        ? Math.max(TCG_MIN_MXN, product.price)
        : product.price ?? 0;

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const hasPrice = displayPrice != null && displayPrice > 0;
  const canAddToCart = !(isTcgProduct && !hasPrice);

  const handleAddToCart = async () => {
    if (!canAddToCart) return;
    setIsAddingToCart(true);
    const cartPrice = isTcgProduct && marketPriceMxn != null ? Math.max(15, marketPriceMxn) : (isTcgProduct ? Math.max(15, product.price ?? 0) : (product.price ?? 0));

    await addToCartWithSync({
      id: product.id,
      name: product.name,
      description: product.description,
      price: cartPrice,
      image: product.image || (product.images && product.images.length > 0 ? product.images[0] : null)
    }, user, apiRequest, quantity);
    
    // Simular feedback visual
    setTimeout(() => {
      setIsAddingToCart(false);
    }, 1000);
  };

  const handleBuyNow = async () => {
    if (!canAddToCart) return;
    const cartPrice = isTcgProduct && marketPriceMxn != null ? Math.max(15, marketPriceMxn) : (isTcgProduct ? Math.max(15, product.price ?? 0) : (product.price ?? 0));
    await addToCartWithSync({
      id: product.id,
      name: product.name,
      description: product.description,
      price: cartPrice,
      image: product.image || (product.images && product.images.length > 0 ? product.images[0] : null)
    }, user, apiRequest, quantity);
    
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
        <div className={styles.price}>
          {isTcgProduct && marketPriceMxn == null && (!product.price || product.price <= 0)
            ? 'Consultar precio'
            : formatPrice(displayPrice)}
        </div>
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
          {hasPrice ? formatPrice(displayPrice * quantity) : 'Consultar'}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.addToCartBtn}
          onClick={handleAddToCart}
          disabled={isAddingToCart || !canAddToCart}
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
          disabled={!canAddToCart}
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