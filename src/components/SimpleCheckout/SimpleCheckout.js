'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import OrderConfirmation from '../OrderConfirmation/OrderConfirmation';
import AddressManager from '../AddressManager/AddressManager';
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
    paymentMethod: 'transfer', // Default to transfer for deliveries
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);

  const { items, clearCart, getTotalPrice } = useCart();
  const { user, isAuthenticated, apiRequest } = useAuth();
  const router = useRouter();

  // Pre-llenar datos si el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      
      setFormData(prev => ({
        ...prev,
        name: fullName || user.name || user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
      
      // Load user addresses
      loadUserAddresses();
    }
  }, [isAuthenticated, user]);

  // Load user addresses
  const loadUserAddresses = async () => {
    if (!isAuthenticated || !apiRequest) return;
    
    try {
      const response = await apiRequest('/api/users/addresses');
      if (response.ok) {
        const data = await response.json();
        const addresses = data.addresses || [];
        setUserAddresses(addresses);
        
        // Auto-select default address if exists
        const defaultAddress = addresses.find(addr => addr.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
          populateAddressFields(defaultAddress);
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  // Populate address fields from selected address
  const populateAddressFields = (address) => {
    if (!address) return;
    
    // Parse address_line_1 to try to separate street and number
    const addressParts = address.address_line_1.split(' ');
    const lastPart = addressParts[addressParts.length - 1];
    const isNumber = /^\d+/.test(lastPart);
    
    let street, number;
    if (isNumber) {
      number = lastPart;
      street = addressParts.slice(0, -1).join(' ');
    } else {
      street = address.address_line_1;
      number = '';
    }
    
    setFormData(prev => ({
      ...prev,
      street: street,
      number: number,
      neighborhood: address.address_line_2 || '',
      city: address.city,
      postalCode: address.postal_code
    }));
  };

  // Handle address selection
  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setUseNewAddress(false);
    setShowAddressManager(false);
    populateAddressFields(address);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Force transfer payment for delivery
    if (field === 'deliveryType' && value === 'delivery') {
      setFormData(prev => ({ ...prev, [field]: value, paymentMethod: 'transfer' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear selected address if manually editing address fields
    if (['street', 'number', 'neighborhood', 'city', 'postalCode'].includes(field)) {
      setSelectedAddress(null);
      setUseNewAddress(true);
    }
    
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
      // Check if using selected address or manual entry
      if (!selectedAddress || useNewAddress) {
        // Manual entry validation
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
      // If using selected address, no need to validate individual fields
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
    
    // If using selected address, format it properly
    if (selectedAddress && !useNewAddress) {
      const parts = [
        selectedAddress.address_line_1,
        selectedAddress.address_line_2,
        selectedAddress.city,
        selectedAddress.state,
        selectedAddress.postal_code
      ].filter(part => part && part.trim());
      
      return parts.join(', ');
    }
    
    // Otherwise use manual entry
    const parts = [
      formData.street,
      formData.number,
      formData.neighborhood,
      formData.city,
      formData.postalCode
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verificar que hay productos en el carrito
    if (!items || items.length === 0) {
      toast.error('No hay productos en el carrito');
      return;
    }
    
    // Validar formulario
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos obligatorios');
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

      if (!orderResponse.ok) {
        const errData = await orderResponse.json().catch(() => ({}));
        const errMessage = errData?.error || 'No se pudo crear la orden';
        toast.error(errMessage);
        return;
      }

      const orderResult = await orderResponse.json();
      const orderNumber = orderResult?.order_number || `TEMP-${Date.now()}`;

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
          <span className={styles.logoText}>🦆 Wildshot Games</span>
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
                  <div className={styles.addressSectionHeader}>
                    <h3>Dirección de Envío *</h3>
                    {isAuthenticated && userAddresses.length > 0 && !showAddressManager && (
                      <button
                        type="button"
                        onClick={() => setShowAddressManager(true)}
                        className={styles.manageAddressButton}
                      >
                        Gestionar Direcciones
                      </button>
                    )}
                  </div>

                  {/* Address Manager Modal */}
                  {showAddressManager && isAuthenticated && (
                    <div className={styles.addressManagerModal}>
                      <div className={styles.addressManagerContent}>
                        <AddressManager
                          onAddressSelect={handleAddressSelect}
                          selectedAddress={selectedAddress}
                          onCancel={() => setShowAddressManager(false)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Selected Address Display */}
                  {selectedAddress && !useNewAddress && (
                    <div className={styles.selectedAddressCard}>
                      <div className={styles.selectedAddressInfo}>
                        <h4>Dirección Seleccionada:</h4>
                        <p><strong>{selectedAddress.first_name} {selectedAddress.last_name}</strong></p>
                        <p>{selectedAddress.address_line_1}</p>
                        {selectedAddress.address_line_2 && <p>{selectedAddress.address_line_2}</p>}
                        <p>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                        {selectedAddress.phone && <p>📞 {selectedAddress.phone}</p>}
                      </div>
                      <div className={styles.selectedAddressActions}>
                        <button
                          type="button"
                          onClick={() => setShowAddressManager(true)}
                          className={styles.changeAddressButton}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddress(null);
                            setUseNewAddress(true);
                            setFormData(prev => ({
                              ...prev,
                              street: '',
                              number: '',
                              neighborhood: '',
                              city: '',
                              postalCode: ''
                            }));
                          }}
                          className={styles.newAddressButton}
                        >
                          Nueva Dirección
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual Address Entry */}
                  {(useNewAddress || !selectedAddress || !isAuthenticated) && (
                    <div className={styles.manualAddressForm}>
                      {isAuthenticated && userAddresses.length > 0 && (
                        <div className={styles.addressToggle}>
                          <button
                            type="button"
                            onClick={() => setShowAddressManager(true)}
                            className={styles.selectExistingButton}
                          >
                            Seleccionar Dirección Guardada
                          </button>
                        </div>
                      )}
                      
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
              )}
            </div>

            {/* Método de Pago */}
            <div className={styles.section}>
              <h2>Método de Pago</h2>
              
              {formData.deliveryType === 'delivery' && (
                <div className={styles.paymentNotice}>
                  <p>⚠️ Para envíos a domicilio, el pago debe ser por transferencia bancaria.</p>
                </div>
              )}
              
              <div className={styles.radioGroup}>
                <label className={`${styles.radioOption} ${formData.deliveryType === 'delivery' ? styles.disabled : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={formData.paymentMethod === 'cash'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    disabled={formData.deliveryType === 'delivery'}
                  />
                  <span className={styles.radioLabel}>
                    <strong>Pago Contra Entrega</strong>
                    <small>{formData.deliveryType === 'delivery' ? 'No disponible para envíos' : 'Paga cuando recibas tu pedido'}</small>
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
                    {formData.deliveryType === 'delivery' && (
                      <small className={styles.required}>* Requerido para envíos</small>
                    )}
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

            {/* Debug info - remove in production */}
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Debug: Items: {items?.length || 0}, isSubmitting: {isSubmitting.toString()}, 
              deliveryType: {formData.deliveryType}, paymentMethod: {formData.paymentMethod}
              {selectedAddress && <span>, Dirección seleccionada: ✓</span>}
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isSubmitting || !items || items.length === 0}
              onClick={(e) => {
                console.log('Button clicked!');
                console.log('Form data:', formData);
                console.log('Items:', items);
                console.log('Is submitting:', isSubmitting);
                // Don't prevent default - let the form handle submission
              }}
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
