'use client';

import { useState } from 'react';
import { useCart } from '../../lib/CartContext';
import styles from './CartSummary.module.css';

export default function CartSummary() {
  const { getTotalPrice, items, clearCart } = useCart();
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  const deliveryFee = deliveryType === 'delivery' ? 120 : 0;
  const subtotal = getTotalPrice();
  const total = subtotal + deliveryFee;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleContactChange = (field, value) => {
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitOrder = () => {
    // Validar campos requeridos
    if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
      alert('Por favor completa todos los campos obligatorios (nombre, email y teléfono)');
      return;
    }

    if (deliveryType === 'delivery' && !contactInfo.address) {
      alert('Por favor ingresa tu dirección para el envío');
      return;
    }

    // Crear mensaje de WhatsApp
    const orderSummary = items.map(item => 
      `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
    ).join('\n');

    const message = `🛍️ *Nueva Orden - Patito Montenegro*\n\n` +
      `👤 *Información de Contacto:*\n` +
      `Nombre: ${contactInfo.name}\n` +
      `Email: ${contactInfo.email}\n` +
      `Teléfono: ${contactInfo.phone}\n\n` +
      `📦 *Productos:*\n${orderSummary}\n\n` +
      `💰 *Resumen de Precios:*\n` +
      `Subtotal: ${formatPrice(subtotal)}\n` +
      `${deliveryType === 'delivery' ? `Envío: ${formatPrice(deliveryFee)}\n` : 'Recoger en tienda: Sin costo\n'}` +
      `*Total: ${formatPrice(total)}*\n\n` +
      `🚚 *Tipo de Entrega:* ${deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda'}\n` +
      `${deliveryType === 'delivery' ? `📍 Dirección: ${contactInfo.address}\n` : ''}` +
      `💳 *Método de Pago:* ${paymentMethod === 'cash' ? 'Pago contra entrega' : 'Transferencia bancaria'}\n` +
      `${contactInfo.notes ? `📝 Notas adicionales: ${contactInfo.notes}` : ''}`;

    const whatsappUrl = `https://wa.me/573123456789?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    // Limpiar carrito después de enviar
    clearCart();
    alert('¡Orden enviada! Te contactaremos pronto por WhatsApp.');
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

      {/* Opciones de entrega */}
      <div className={styles.section}>
        <h3>Tipo de Entrega</h3>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              value="delivery"
              checked={deliveryType === 'delivery'}
              onChange={(e) => setDeliveryType(e.target.value)}
            />
            <span>Envío a domicilio (+$120)</span>
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              value="pickup"
              checked={deliveryType === 'pickup'}
              onChange={(e) => setDeliveryType(e.target.value)}
            />
            <span>Recoger en tienda (Gratis)</span>
          </label>
        </div>
      </div>

      {/* Información de contacto */}
      <div className={styles.section}>
        <h3>Información de Contacto</h3>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Nombre completo *"
            value={contactInfo.name}
            onChange={(e) => handleContactChange('name', e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <input
            type="email"
            placeholder="Correo electrónico *"
            value={contactInfo.email}
            onChange={(e) => handleContactChange('email', e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <input
            type="tel"
            placeholder="Teléfono *"
            value={contactInfo.phone}
            onChange={(e) => handleContactChange('phone', e.target.value)}
            className={styles.input}
            required
          />
        </div>
        {deliveryType === 'delivery' && (
          <div className={styles.formGroup}>
            <textarea
              placeholder="Dirección completa para envío *"
              value={contactInfo.address}
              onChange={(e) => handleContactChange('address', e.target.value)}
              className={styles.textarea}
              rows={3}
              required
            />
          </div>
        )}
        <div className={styles.formGroup}>
          <textarea
            placeholder="Notas adicionales (opcional)"
            value={contactInfo.notes}
            onChange={(e) => handleContactChange('notes', e.target.value)}
            className={styles.textarea}
            rows={2}
          />
        </div>
      </div>

      {/* Opciones de pago */}
      <div className={styles.section}>
        <h3>Método de Pago</h3>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <span>Pago contra entrega</span>
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              value="transfer"
              checked={paymentMethod === 'transfer'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <span>Transferencia bancaria</span>
          </label>
        </div>
      </div>

      <button 
        className={styles.orderButton}
        onClick={handleSubmitOrder}
        disabled={items.length === 0}
      >
        Crear pedido
      </button>
    </div>
  );
} 