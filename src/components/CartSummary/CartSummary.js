'use client';

import { useCart } from '../../lib/CartContext';
import Link from 'next/link';
import styles from './CartSummary.module.css';

export default function CartSummary() {
  const { getTotalPrice, items } = useCart();

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
        <p>💡 El costo de envío se calculará en el checkout según tu ubicación y tipo de entrega.</p>
      </div>

      {/* Botón para ir al checkout */}
      <Link href="/checkout" className={styles.checkoutButton}>
        Continuar al Checkout
      </Link>

      {/* Información adicional */}
      <div className={styles.additionalInfo}>
        <p>✅ Envío seguro y rastreado</p>
        <p>💳 Múltiples métodos de pago</p>
        <p>🔄 Devoluciones fáciles</p>
      </div>
    </div>
  );
} 