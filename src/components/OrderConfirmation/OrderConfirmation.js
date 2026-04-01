'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import styles from './OrderConfirmation.module.css';

const BBVA_TITULAR = 'María Fernanda Villegas Nieto';

export default function OrderConfirmation({ 
  orderNumber, 
  customerName, 
  total, 
  deliveryType, 
  pickupPoint,
  paymentMethod,
  estimatedDelivery 
}) {
  const router = useRouter();
  const clabe = process.env.NEXT_PUBLIC_BBVA_CLABE || '';
  const cardNumber = process.env.NEXT_PUBLIC_BBVA_CARD_NUMBER || '';

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Auto-redirect to orders page after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/profile');
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Header />
      <div className={styles.confirmationContainer}>
      <div className={styles.confirmationCard}>
        {/* Success Icon */}
        <div className={styles.successIcon}>
          <div className={styles.checkmark}>✓</div>
        </div>

        {/* Main Message */}
        <h1 className={styles.title}>¡Pedido Confirmado!</h1>
        <p className={styles.subtitle}>
          Gracias {customerName}, tu pedido ha sido procesado exitosamente
        </p>

        {/* Order Details */}
        <div className={styles.orderDetails}>
          <div className={styles.orderNumber}>
            <span className={styles.label}>Número de Orden:</span>
            <span className={styles.value}>{orderNumber}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Total:</span>
            <span className={styles.total}>{formatPrice(total)}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Tipo de Entrega:</span>
            <span className={styles.value}>
              {deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en punto'}
            </span>
          </div>

          {deliveryType === 'pickup' && pickupPoint && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Punto de recolección:</span>
              <span className={styles.value}>{pickupPoint}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.label}>Método de Pago:</span>
            <span className={styles.value}>
              {paymentMethod === 'cash'
                ? 'Pago contra entrega'
                : paymentMethod === 'stripe'
                  ? 'Tarjeta (Stripe)'
                  : 'Transferencia bancaria'}
            </span>
          </div>

          {deliveryType === 'delivery' && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Tiempo estimado:</span>
              <span className={styles.value}>{estimatedDelivery || '1-2 días hábiles'}</span>
            </div>
          )}
        </div>

        {paymentMethod === 'stripe' && (
          <div className={styles.transferSection}>
            <p className={styles.transferNotice}>
              Tu pago con tarjeta fue procesado de forma segura. Recibirás la confirmación por correo.
            </p>
          </div>
        )}

        {paymentMethod === 'transfer' && (
          <div className={styles.transferSection}>
            <div className={styles.transferNotice}>
              <strong>IMPORTANTE:</strong> Agrega el número de pedido <strong>{orderNumber}</strong> en el concepto o referencia de tu transferencia.
            </div>

            <div className={styles.transferCancelWarning}>
              Si no se recibe el comprobante de pago o el número de pedido no se agrega en la transferencia, el pedido será cancelado.
            </div>

            <div className={styles.transferDetails}>
              <h4>Datos para transferencia</h4>
              <p><strong>Banco:</strong> BBVA</p>
              <p><strong>Titular:</strong> {BBVA_TITULAR}</p>
              {clabe && <p><strong>CLABE:</strong> <span className={styles.mono}>{clabe}</span></p>}
              {cardNumber && <p><strong>Número de tarjeta:</strong> <span className={styles.mono}>{cardNumber}</span></p>}
            </div>
          </div>
        )}

        <div className={styles.nextSteps}>
          <h3>¿Qué sigue?</h3>
          <ul>
            <li>Se enviará mensaje por correo electrónico y teléfono para confirmar el día de entrega.</li>
            <li>Recibirás un email de confirmación en breve</li>
            <li>Nos pondremos en contacto contigo para coordinar la entrega</li>
            <li>Puedes seguir el estado de tu pedido en tu perfil</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Link href="/profile" className={styles.primaryButton}>
            Ver Mis Órdenes
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            Continuar Comprando
          </Link>
        </div>

        {/* Auto-redirect notice */}
        <p className={styles.autoRedirect}>
          Serás redirigido a tu perfil automáticamente en 10 segundos
        </p>
      </div>
    </div>
      <Footer />
    </>
  );
}
