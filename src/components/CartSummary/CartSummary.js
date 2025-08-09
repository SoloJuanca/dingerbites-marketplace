'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import styles from './CartSummary.module.css';

export default function CartSummary() {
  const { getTotalPrice, items, clearCart } = useCart();
  const { user, isAuthenticated, apiRequest } = useAuth();
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');

  // Load user info and addresses when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setContactInfo(prev => ({
        ...prev,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone || ''
      }));
      
      // Load user addresses
      loadUserAddresses();
    }
  }, [isAuthenticated, user]);

  const loadUserAddresses = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiRequest('/api/users/addresses');
      if (response.ok) {
        const data = await response.json();
        setUserAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

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

  const handleAddressSelect = (addressId) => {
    const address = userAddresses.find(addr => addr.id === addressId);
    if (address) {
      const fullAddress = `${address.address_line_1}${address.address_line_2 ? ', ' + address.address_line_2 : ''}, ${address.city}, ${address.state}, ${address.postal_code}`;
      setContactInfo(prev => ({
        ...prev,
        address: fullAddress
      }));
      setSelectedAddress(addressId);
    }
  };

  const handleSubmitOrder = async () => {
    // Validar campos requeridos
    if (!contactInfo.name || !contactInfo.email || !contactInfo.phone) {
      toast.error('Por favor completa todos los campos obligatorios (nombre, email y teléfono)');
      return;
    }

    if (deliveryType === 'delivery' && !contactInfo.address) {
      toast.error('Por favor ingresa tu dirección para el envío');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order data
      const orderData = {
        user_id: isAuthenticated ? user.id : null,
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        customer_email: contactInfo.email,
        customer_phone: contactInfo.phone,
        payment_method: paymentMethod === 'cash' ? 'Pago contra entrega' : 'Transferencia bancaria',
        shipping_method: deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda',
        subtotal: subtotal,
        shipping_amount: deliveryFee,
        total_amount: total,
        notes: contactInfo.notes
      };

      // Create order in database (for both authenticated and guest users)
      let orderResponse;
      if (isAuthenticated) {
        orderResponse = await apiRequest('/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
      } else {
        orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        });
      }

      let orderResult = null;
      if (orderResponse.ok) {
        orderResult = await orderResponse.json();
      }

      // Create WhatsApp message
      const orderSummary = items.map(item => 
        `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
      ).join('\n');

      const orderNumber = orderResult?.order?.order_number || `TEMP-${Date.now()}`;
      
      const message = `🛍️ *Nueva Orden - Patito Montenegro*\n` +
        `📋 *Número de Orden:* ${orderNumber}\n\n` +
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
      
      // Clear cart after successful order
      clearCart();
      
      if (isAuthenticated) {
        toast.success(`¡Orden ${orderNumber} creada exitosamente! Te contactaremos pronto por WhatsApp. Puedes revisar el estado de tu orden en tu perfil.`);
      } else {
        toast.success('¡Orden enviada! Te contactaremos pronto por WhatsApp.');
      }

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Hubo un error al crear la orden. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
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

      {/* Authentication Status */}
      {!isAuthenticated && (
        <div className={styles.guestNotice}>
          <p>💡 ¿Ya tienes cuenta? <a href="/auth/login">Inicia sesión</a> para un checkout más rápido y seguimiento de pedidos.</p>
        </div>
      )}

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
            disabled={isAuthenticated}
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
            disabled={isAuthenticated}
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
        
        {/* Address Selection for Authenticated Users */}
        {deliveryType === 'delivery' && isAuthenticated && userAddresses.length > 0 && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Selecciona una dirección guardada:</label>
            <select
              value={selectedAddress}
              onChange={(e) => handleAddressSelect(e.target.value)}
              className={styles.select}
            >
              <option value="">-- Nueva dirección --</option>
              {userAddresses.map(address => (
                <option key={address.id} value={address.id}>
                  {address.address_line_1}, {address.city}
                  {address.is_default && ' (Predeterminada)'}
                </option>
              ))}
            </select>
          </div>
        )}
        
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
        className={`${styles.orderButton} ${isSubmitting ? styles.orderButtonLoading : ''}`}
        onClick={handleSubmitOrder}
        disabled={items.length === 0 || isSubmitting}
      >
        {isSubmitting ? 'Procesando...' : 'Crear pedido'}
      </button>
    </div>
  );
} 