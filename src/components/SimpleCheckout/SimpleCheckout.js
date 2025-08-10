'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import OrderConfirmation from '../OrderConfirmation/OrderConfirmation';
import styles from './SimpleCheckout.module.css';

export default function SimpleCheckout() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    postalCode: '',
    deliveryType: 'delivery',
    paymentMethod: 'cash',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const { items, clearCart, getTotalPrice } = useCart();
  const { user, isAuthenticated, apiRequest } = useAuth();
  const router = useRouter();

  // Pre-llenar datos si el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      // Intentar parsear la dirección existente si existe
      let addressParts = {
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        postalCode: ''
      };
      
      if (user.address) {
        // Si existe una dirección, la ponemos en el campo street para no perder información
        addressParts.street = user.address;
      }
      
      setFormData(prev => ({
        ...prev,
        name: user.name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        ...addressParts
      }));
    }
  }, [isAuthenticated, user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    }
    
    if (formData.deliveryType === 'delivery') {
      if (!formData.street.trim()) {
        newErrors.street = 'La calle es obligatoria';
      }
      if (!formData.number.trim()) {
        newErrors.number = 'El número es obligatorio';
      }
      if (!formData.neighborhood.trim()) {
        newErrors.neighborhood = 'La colonia es obligatoria';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'La ciudad es obligatoria';
      }
      if (!formData.postalCode.trim()) {
        newErrors.postalCode = 'El código postal es obligatorio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getShippingCost = () => {
    return formData.deliveryType === 'delivery' ? 120 : 0;
  };

  const getSubtotal = () => {
    return getTotalPrice();
  };

  const getDiscount = () => {
    return formData.paymentMethod === 'transfer' ? getSubtotal() * 0 : 0;
  };

  const getTotal = () => {
    return getSubtotal() + getShippingCost() - getDiscount();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatAddress = () => {
    if (formData.deliveryType === 'pickup') return null;
    
    const parts = [
      formData.street,
      formData.number,
      formData.neighborhood,
      formData.city,
      formData.postalCode
    ].filter(part => part.trim());
    
    return parts.join(', ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const subtotal = getSubtotal();
      const shippingAmount = getShippingCost();
      const discount = getDiscount();
      const totalAmount = getTotal();

      const orderData = {
        user_id: isAuthenticated ? user.id : null,
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_name: formData.name,
        payment_method: formData.paymentMethod === 'cash' ? 'Pago contra entrega' : 'Transferencia bancaria',
        shipping_method: formData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda',
        subtotal: subtotal,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        notes: formData.notes || '',
        address: formData.deliveryType === 'delivery' ? formatAddress() : null
      };

      // Crear orden en la base de datos
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

      // Preparar datos para la confirmación
      const orderNumber = orderResult?.order?.order_number || `TEMP-${Date.now()}`;

      // Limpiar carrito después de la orden exitosa
      clearCart();

      // Mostrar confirmación
      setOrderData({
        orderNumber,
        customerName: formData.name,
        total: totalAmount,
        deliveryType: formData.deliveryType,
        paymentMethod: formData.paymentMethod,
        estimatedDelivery: formData.deliveryType === 'delivery' ? '1-2 días hábiles' : 'Disponible para recoger'
      });

      setOrderConfirmed(true);

      if (isAuthenticated) {
        toast.success(`¡Orden ${orderNumber} creada exitosamente!`);
      } else {
        toast.success('¡Orden enviada exitosamente!');
      }

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Hubo un error al crear la orden. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar confirmación si el pedido fue exitoso
  if (orderConfirmed && orderData) {
    return (
      <OrderConfirmation 
        orderNumber={orderData.orderNumber}
        customerName={orderData.customerName}
        total={orderData.total}
        deliveryType={orderData.deliveryType}
        paymentMethod={orderData.paymentMethod}
        estimatedDelivery={orderData.estimatedDelivery}
      />
    );
  }

  return (
    <div className={styles.simpleCheckout}>
      {/* Header del Checkout */}
      <div className={styles.checkoutHeader}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>🦆 Patito Montenegro</span>
        </Link>
        <Link href="/cart" className={styles.backToCart}>
          ← Volver al Carrito
        </Link>
      </div>

      <div className={styles.header}>
        <h1>Finalizar Compra</h1>
        <p>Completa tus datos para procesar tu pedido</p>
      </div>

      <div className={styles.content}>
        <div className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Información Personal */}
            <div className={styles.section}>
              <h2>Información Personal</h2>
              
              <div className={styles.inputGroup}>
                <label htmlFor="name">Nombre Completo *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? styles.error : ''}
                  placeholder="Tu nombre completo"
                />
                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? styles.error : ''}
                    placeholder="tu@email.com"
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="phone">Teléfono *</label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={errors.phone ? styles.error : ''}
                    placeholder="10 dígitos"
                  />
                  {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                </div>
              </div>
            </div>

            {/* Tipo de Entrega */}
            <div className={styles.section}>
              <h2>Tipo de Entrega</h2>
              
              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="delivery"
                    checked={formData.deliveryType === 'delivery'}
                    onChange={(e) => handleInputChange('deliveryType', e.target.value)}
                  />
                  <span className={styles.radioLabel}>
                    <strong>Envío a Domicilio</strong> - $120 MXN
                    <small>Tiempo estimado: 1-2 días hábiles</small>
                  </span>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="pickup"
                    checked={formData.deliveryType === 'pickup'}
                    onChange={(e) => handleInputChange('deliveryType', e.target.value)}
                  />
                  <span className={styles.radioLabel}>
                    <strong>Recoger en Tienda</strong> - Gratis
                    <small>Av. Principal #123, Centro Histórico</small>
                  </span>
                </label>
              </div>

              {formData.deliveryType === 'delivery' && (
                <div className={styles.addressSection}>
                  <h3>Dirección de Envío *</h3>
                  
                  <div className={styles.row}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="street">Calle *</label>
                      <input
                        type="text"
                        id="street"
                        value={formData.street}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                        className={errors.street ? styles.error : ''}
                        placeholder="Nombre de la calle"
                      />
                      {errors.street && <span className={styles.errorText}>{errors.street}</span>}
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="number">Número *</label>
                      <input
                        type="text"
                        id="number"
                        value={formData.number}
                        onChange={(e) => handleInputChange('number', e.target.value)}
                        className={errors.number ? styles.error : ''}
                        placeholder="Número exterior/interior"
                      />
                      {errors.number && <span className={styles.errorText}>{errors.number}</span>}
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="neighborhood">Colonia *</label>
                      <input
                        type="text"
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                        className={errors.neighborhood ? styles.error : ''}
                        placeholder="Nombre de la colonia"
                      />
                      {errors.neighborhood && <span className={styles.errorText}>{errors.neighborhood}</span>}
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="city">Ciudad *</label>
                      <input
                        type="text"
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={errors.city ? styles.error : ''}
                        placeholder="Ciudad"
                      />
                      {errors.city && <span className={styles.errorText}>{errors.city}</span>}
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="postalCode">Código Postal *</label>
                      <input
                        type="text"
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className={errors.postalCode ? styles.error : ''}
                        placeholder="CP"
                        maxLength="5"
                      />
                      {errors.postalCode && <span className={styles.errorText}>{errors.postalCode}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Método de Pago */}
            <div className={styles.section}>
              <h2>Método de Pago</h2>
              
              <div className={styles.radioGroup}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={formData.paymentMethod === 'cash'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  />
                  <span className={styles.radioLabel}>
                    <strong>Pago Contra Entrega</strong>
                    <small>Paga cuando recibas tu pedido</small>
                  </span>
                </label>

                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={formData.paymentMethod === 'transfer'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  />
                  <span className={styles.radioLabel}>
                    <strong>Transferencia Bancaria</strong>
                    <small>Banco Azteca - Cuenta: 1234 5678 9012 3456</small>
                  </span>
                </label>
              </div>
            </div>

            {/* Notas Adicionales */}
            <div className={styles.section}>
              <div className={styles.inputGroup}>
                <label htmlFor="notes">Notas Adicionales (Opcional)</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Instrucciones especiales, referencias, etc."
                  rows={2}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
            </button>
          </form>
        </div>

        {/* Resumen del Pedido */}
        <div className={styles.summarySection}>
          <div className={styles.orderSummary}>
            <h2>Resumen del Pedido</h2>
            
            <div className={styles.items}>
              {items.map((item, index) => (
                <div key={index} className={styles.item}>
                  <span className={styles.itemName}>{item.name} x{item.quantity}</span>
                  <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal:</span>
                <span>{formatPrice(getSubtotal())}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Envío:</span>
                <span>{getShippingCost() > 0 ? formatPrice(getShippingCost()) : 'Gratis'}</span>
              </div>
              {getDiscount() > 0 && (
                <div className={styles.totalRow}>
                  <span>Descuento (5%):</span>
                  <span className={styles.discount}>-{formatPrice(getDiscount())}</span>
                </div>
              )}
              <div className={styles.finalTotal}>
                <span>Total:</span>
                <span>{formatPrice(getTotal())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
