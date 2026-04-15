'use client';

import { useState } from 'react';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import Link from 'next/link';
import styles from './CartSummary.module.css';

export default function CartSummary() {
  const { getTotalPrice, items, clearCart } = useCart();
  const { user, apiRequest } = useAuth();
  const [isClearing, setIsClearing] = useState(false);

  const deliveryFee = 120; // Envío estándar
  const subtotal = getTotalPrice();
  const total = subtotal + deliveryFee;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleClearCart = async () => {
    if (!window.confirm('¿Estás seguro de que quieres vaciar el carrito? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsClearing(true);

    try {
      if (user && apiRequest) {
        // Clear cart from database for authenticated users
        const response = await apiRequest('/api/cart', {
          method: 'DELETE',
          body: JSON.stringify({ userId: user.id, clearAll: true })
        });
        
        if (response.ok) {
          clearCart();
        } else {
          // Fallback to local clear even if API fails
          clearCart();
        }
      } else {
        // Guest user - just clear local storage
        clearCart();
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      // Fallback to local clear
      clearCart();
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className={styles.cartSummary}>
      <h2 className={styles.title}>Resumen de Orden</h2>
      
      {/* Resumen de precios */}
      <div className={styles.priceSection}>
        <div className={styles.priceRow}>
          <span>Subtotal:</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className={styles.priceRow}>
          <span>Envío:</span>
          <span>{formatPrice(deliveryFee)}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Total:</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Nota sobre envío */}
      <div className={styles.shippingNote}>
        <p><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>info</span> El costo de envío se calculará en el checkout según tu ubicación y tipo de entrega.</p>
      </div>

      {/* Botón para ir al checkout */}
      <Link href="/checkout" className={styles.checkoutButton}>
        Continuar al Checkout
      </Link>

      {/* Botón para vaciar carrito */}
      <button 
        onClick={handleClearCart}
        disabled={isClearing}
        className={styles.clearCartButton}
      >
        {isClearing ? 'Vaciando...' : 'Vaciar Carrito'}
      </button>

      {/* Información adicional */}
      <div className={styles.additionalInfo}>
        <p><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#48bb78' }}>check_circle</span> Envío seguro y rastreado</p>
        <p><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#48bb78' }}>credit_card</span> Múltiples métodos de pago</p>
        <p><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#48bb78' }}>sync</span> Devoluciones fáciles</p>
      </div>
    </div>
  );
} 