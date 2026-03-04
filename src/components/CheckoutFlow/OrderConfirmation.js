'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import styles from './OrderConfirmation.module.css';

export default function OrderConfirmation({ 
  checkoutData, 
  items, 
  onConfirm, 
  onBack,
  formatPrice,
  isAuthenticated,
  apiRequest,
  onUpdateCoupon
}) {
  const [couponInput, setCouponInput] = useState(checkoutData.couponCode || '');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const getShippingCost = () => {
    return checkoutData.deliveryType === 'delivery' ? 120 : 0;
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTransferDiscount = () => {
    return checkoutData.paymentMethod === 'transfer' ? getSubtotal() * 0.05 : 0;
  };

  const getCouponDiscount = () => {
    return checkoutData.couponData?.discount_amount || 0;
  };

  const getTotal = () => {
    let total = getSubtotal() + getShippingCost();
    const transferDisc = getTransferDiscount();
    const couponDisc = getCouponDiscount();
    total = total - Math.max(transferDisc, couponDisc);
    return total;
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      toast.error('Ingresa un código de cupón');
      return;
    }
    if (!isAuthenticated || !apiRequest) {
      toast.error('Inicia sesión para usar cupones');
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await apiRequest('/api/orders/validate-coupon', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal: getSubtotal() })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        onUpdateCoupon(code, data.coupon);
        toast.success('Cupón aplicado');
      } else {
        onUpdateCoupon('', null);
        toast.error(data.error || 'Cupón no válido');
      }
    } catch (err) {
      onUpdateCoupon('', null);
      toast.error('Error al validar cupón');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponInput('');
    onUpdateCoupon('', null);
    toast.success('Cupón removido');
  };

  const getPaymentMethodText = () => {
    return checkoutData.paymentMethod === 'cash' ? 'Pago contra entrega' : 'Transferencia bancaria';
  };

  const getDeliveryTypeText = () => {
    return checkoutData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda';
  };

  const getUserTypeText = () => {
    return checkoutData.userType === 'guest' ? 'Invitado' : 'Cuenta registrada';
  };

  return (
    <div className={styles.orderConfirmation}>
      <div className={styles.header}>
        <h2>Confirmar Orden</h2>
        <p>Revisa todos los detalles antes de confirmar tu pedido</p>
      </div>

      <div className={styles.confirmationContent}>
        {/* Resumen de Productos */}
        <div className={styles.section}>
          <h3>🛍️ Productos en tu Pedido</h3>
          <div className={styles.productsList}>
            {items.map((item, index) => (
              <div key={index} className={styles.productItem}>
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{item.name}</span>
                  <span className={styles.productQuantity}>x{item.quantity}</span>
                </div>
                <span className={styles.productPrice}>
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Información de Contacto */}
        <div className={styles.section}>
          <h3>👤 Información de Contacto</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nombre:</span>
              <span className={styles.infoValue}>{checkoutData.contactInfo.name}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email:</span>
              <span className={styles.infoValue}>{checkoutData.contactInfo.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Teléfono:</span>
              <span className={styles.infoValue}>{checkoutData.contactInfo.phone}</span>
            </div>
            {checkoutData.deliveryType === 'delivery' && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Dirección:</span>
                <span className={styles.infoValue}>{checkoutData.contactInfo.address}</span>
              </div>
            )}
            {checkoutData.contactInfo.notes && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Notas:</span>
                <span className={styles.infoValue}>{checkoutData.contactInfo.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detalles de Entrega y Pago */}
        <div className={styles.section}>
          <h3>🚚 Detalles de Entrega y Pago</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tipo de Usuario:</span>
              <span className={styles.infoValue}>{getUserTypeText()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Método de Entrega:</span>
              <span className={styles.infoValue}>{getDeliveryTypeText()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Método de Pago:</span>
              <span className={styles.infoValue}>{getPaymentMethodText()}</span>
            </div>
          </div>
        </div>

        {/* Cupón (solo usuarios autenticados) */}
        {isAuthenticated && (
          <div className={styles.section}>
            <h3>🎟️ Cupón de descuento</h3>
            {checkoutData.couponData ? (
              <div className={styles.couponApplied}>
                <span className={styles.couponCode}>{checkoutData.couponData.code}</span>
                <span className={styles.couponDiscount}>-{formatPrice(checkoutData.couponData.discount_amount)}</span>
                <button type="button" className={styles.removeCouponBtn} onClick={handleRemoveCoupon}>
                  Quitar
                </button>
              </div>
            ) : (
              <div className={styles.couponInputRow}>
                <input
                  type="text"
                  placeholder="Código de cupón"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className={styles.couponInput}
                  disabled={applyingCoupon}
                />
                <button
                  type="button"
                  className={styles.applyCouponBtn}
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon || !couponInput.trim()}
                >
                  {applyingCoupon ? 'Verificando...' : 'Aplicar'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resumen de Precios */}
        <div className={styles.section}>
          <h3>💰 Resumen de Precios</h3>
          <div className={styles.priceSummary}>
            <div className={styles.priceRow}>
              <span>Subtotal ({items.length} productos):</span>
              <span>{formatPrice(getSubtotal())}</span>
            </div>
            <div className={styles.priceRow}>
              <span>Envío:</span>
              <span>{getShippingCost() > 0 ? formatPrice(getShippingCost()) : 'Gratis'}</span>
            </div>
            {checkoutData.paymentMethod === 'transfer' && !checkoutData.couponData && (
              <div className={styles.discountRow}>
                <span>Descuento por transferencia (5%):</span>
                <span>-{formatPrice(getSubtotal() * 0.05)}</span>
              </div>
            )}
            {checkoutData.couponData && (
              <div className={styles.discountRow}>
                <span>Cupón {checkoutData.couponData.code}:</span>
                <span>-{formatPrice(checkoutData.couponData.discount_amount)}</span>
              </div>
            )}
            <div className={styles.totalRow}>
              <span>Total:</span>
              <span>{formatPrice(getTotal())}</span>
            </div>
          </div>
        </div>

        {/* Información Importante */}
        <div className={styles.importantInfo}>
          <h4>⚠️ Información Importante</h4>
          <ul>
            <li>
              <strong>Confirmación:</strong> Recibirás confirmación de tu pedido por WhatsApp
            </li>
            {checkoutData.paymentMethod === 'transfer' && (
              <li>
                <strong>Transferencia:</strong> Envía el comprobante por WhatsApp al (55) 1234-5678
              </li>
            )}
            {checkoutData.deliveryType === 'delivery' && (
              <li>
                <strong>Envío:</strong> Tiempo estimado de 1-2 días hábiles
              </li>
            )}
            {checkoutData.deliveryType === 'pickup' && (
              <li>
                <strong>Recogida:</strong> Te notificaremos cuando esté listo (30 min - 2 horas)
              </li>
            )}
            <li>
              <strong>Contacto:</strong> Cualquier duda al (55) 1234-5678
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={onBack}>
          Atrás
        </button>
        <button className={styles.confirmButton} onClick={onConfirm}>
          🎉 Confirmar Orden
        </button>
      </div>
    </div>
  );
}
