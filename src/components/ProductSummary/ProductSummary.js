'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Icon from '../Icon/Icon';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { getProductRatingStats } from '../../lib/reviews';
import styles from './ProductSummary.module.css';

export default function ProductSummary({ product, marketPriceMxn = null, isTcgProduct = false }) {
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isReminderLoading, setIsReminderLoading] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { addToCartWithSync } = useCart();
  const { user, apiRequest, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  const hasPrice = displayPrice != null && displayPrice > 0;
  const stockQuantity = Number(product.stock_quantity || 0);
  const isOutOfStock = stockQuantity <= 0;
  const maxSelectableQuantity = Math.max(1, Math.min(10, stockQuantity || 1));
  const canAddToCart = !(isTcgProduct && !hasPrice) && !isOutOfStock;

  const handleQuantityChange = (newQuantity) => {
    const bounded = Math.max(1, Math.min(maxSelectableQuantity, Number(newQuantity) || 1));
    setQuantity(bounded);
  };

  useEffect(() => {
    setQuantity((prev) => Math.max(1, Math.min(prev, maxSelectableQuantity)));
  }, [maxSelectableQuantity]);

  useEffect(() => {
    let active = true;
    async function loadReminderStatus() {
      if (!isAuthenticated || !isOutOfStock || !product.id) {
        if (active) setHasReminder(false);
        return;
      }
      try {
        const response = await apiRequest('/api/users/stock-alerts');
        if (!response.ok) return;
        const data = await response.json();
        const subscribed = (data.items || []).some((item) => String(item.product_id) === String(product.id));
        if (active) setHasReminder(subscribed);
      } catch (error) {
        console.error('Error loading stock reminders:', error);
      }
    }

    loadReminderStatus();
    return () => {
      active = false;
    };
  }, [apiRequest, isAuthenticated, isOutOfStock, product.id]);

  const handleAddToCart = async () => {
    if (!canAddToCart) return;
    if (quantity > stockQuantity) {
      toast.error(`Solo hay ${stockQuantity} unidad(es) disponibles`);
      handleQuantityChange(stockQuantity);
      return;
    }
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
    if (quantity > stockQuantity) {
      toast.error(`Solo hay ${stockQuantity} unidad(es) disponibles`);
      handleQuantityChange(stockQuantity);
      return;
    }
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

  const handleReminderToggle = async () => {
    if (!product.id) return;

    if (!isAuthenticated) {
      const redirect = pathname || `/catalog/${product.slug}`;
      router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    setIsReminderLoading(true);
    try {
      if (hasReminder) {
        const response = await apiRequest(`/api/users/stock-alerts?productId=${product.id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo eliminar el recordatorio');
        }
        setHasReminder(false);
        toast.success('Recordatorio eliminado');
      } else {
        const response = await apiRequest('/api/users/stock-alerts', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'No se pudo crear el recordatorio');
        }
        setHasReminder(true);
        toast.success('Te avisaremos cuando vuelva a haber stock');
      }
    } catch (error) {
      console.error('Error updating stock reminder:', error);
      toast.error(error.message || 'No se pudo actualizar el recordatorio');
    } finally {
      setIsReminderLoading(false);
    }
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

      <div className={`${styles.stock} ${isOutOfStock ? styles.stockOut : ''}`}>
        <Icon
          name={isOutOfStock ? 'error' : 'check_circle'}
          size={16}
          className={styles.stockIcon}
        />
        <span>
          {isOutOfStock ? 'Sin stock por ahora' : 'En stock - Envío inmediato'}
        </span>
      </div>

      {isOutOfStock && (
        <button
          className={`${styles.reminderBtn} ${hasReminder ? styles.reminderBtnActive : ''}`}
          onClick={handleReminderToggle}
          disabled={isReminderLoading}
        >
          <Icon name={hasReminder ? 'notifications_active' : 'notifications'} size={20} />
          {isReminderLoading
            ? 'Actualizando...'
            : hasReminder
              ? 'Quitar recordatorio'
              : 'Avísame cuando haya stock'}
        </button>
      )}

      {!isOutOfStock && (
        <>
          <div className={styles.quantity}>
            <label className={styles.quantityLabel}>Cantidad:</label>
            <div className={styles.quantityControls}>
              <button
                className={styles.quantityBtn}
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1 || !canAddToCart}
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
                disabled={!canAddToCart}
              />
              <button
                className={styles.quantityBtn}
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxSelectableQuantity || !canAddToCart}
                aria-label="Aumentar cantidad"
              >
                <Icon name="add" size={16} />
              </button>
            </div>
            <small className={styles.stockLimitHint}>
              Máximo disponible: {stockQuantity}
            </small>
          </div>

          <div className={styles.totalPrice}>
            <span className={styles.totalLabel}>Total:</span>
            <span className={styles.totalAmount}>
              {hasPrice ? formatPrice(displayPrice * quantity) : 'Consultar'}
            </span>
          </div>
        </>
      )}

      {!isOutOfStock && (
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
      )}

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