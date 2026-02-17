'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import styles from './CheckoutFlow.module.css';

// Componentes de cada paso
import UserTypeSelection from './UserTypeSelection';
import DeliveryTypeSelection from './DeliveryTypeSelection';
import ContactForm from './ContactForm';
import PaymentMethodSelection from './PaymentMethodSelection';
import OrderConfirmation from './OrderConfirmation';
import OrderSuccess from './OrderSuccess';

const STEPS = {
  USER_TYPE: 'user_type',
  DELIVERY_TYPE: 'delivery_type',
  CONTACT_INFO: 'contact_info',
  PAYMENT_METHOD: 'payment_method',
  CONFIRMATION: 'confirmation',
  ORDER_SUCCESS: 'order_success'
};

export default function CheckoutFlow() {
  const [currentStep, setCurrentStep] = useState(STEPS.USER_TYPE);
  const [orderNumber, setOrderNumber] = useState(null);
  const [checkoutData, setCheckoutData] = useState({
    userType: null, // 'guest' o 'account'
    deliveryType: null, // 'delivery' o 'pickup'
    contactInfo: {},
    paymentMethod: null, // 'cash' o 'transfer'
  });
  
  const { items, clearCart, getTotalPrice } = useCart();
  const { user, isAuthenticated, apiRequest } = useAuth();
  const router = useRouter();

  // Si el usuario ya está autenticado, saltar al paso de tipo de entrega
  useEffect(() => {
    if (isAuthenticated && currentStep === STEPS.USER_TYPE) {
      setCheckoutData(prev => ({ ...prev, userType: 'account' }));
      setCurrentStep(STEPS.DELIVERY_TYPE);
    }
  }, [isAuthenticated, currentStep]);

  const updateCheckoutData = (field, value) => {
    setCheckoutData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const goToNextStep = () => {
    switch (currentStep) {
      case STEPS.USER_TYPE:
        if (checkoutData.userType) {
          setCurrentStep(STEPS.DELIVERY_TYPE);
        }
        break;
      case STEPS.DELIVERY_TYPE:
        if (checkoutData.deliveryType) {
          setCurrentStep(STEPS.CONTACT_INFO);
        }
        break;
      case STEPS.CONTACT_INFO:
        if (isContactInfoValid()) {
          setCurrentStep(STEPS.PAYMENT_METHOD);
        }
        break;
      case STEPS.PAYMENT_METHOD:
        if (checkoutData.paymentMethod) {
          setCurrentStep(STEPS.CONFIRMATION);
        }
        break;
    }
  };

  const goToPreviousStep = () => {
    switch (currentStep) {
      case STEPS.DELIVERY_TYPE:
        setCurrentStep(STEPS.USER_TYPE);
        break;
      case STEPS.CONTACT_INFO:
        setCurrentStep(STEPS.DELIVERY_TYPE);
        break;
      case STEPS.PAYMENT_METHOD:
        setCurrentStep(STEPS.CONTACT_INFO);
        break;
      case STEPS.CONFIRMATION:
        setCurrentStep(STEPS.PAYMENT_METHOD);
        break;
    }
  };

  const isContactInfoValid = () => {
    const { contactInfo, deliveryType } = checkoutData;
    const requiredFields = ['name', 'email', 'phone'];
    
    if (deliveryType === 'delivery') {
      requiredFields.push('address');
    }
    
    return requiredFields.every(field => 
      contactInfo[field] && contactInfo[field].trim() !== ''
    );
  };

  const handleSubmitOrder = async () => {
    if (!isContactInfoValid()) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
                        const subtotal = getTotalPrice();
                  const shippingAmount = checkoutData.deliveryType === 'delivery' ? 120 : 0;
                  const discount = checkoutData.paymentMethod === 'transfer' ? subtotal * 0.05 : 0;
                  const totalAmount = subtotal + shippingAmount - discount;

                  const orderData = {
                    user_id: isAuthenticated ? user.id : null,
                    items: items.map(item => ({
                      product_id: item.id,
                      quantity: item.quantity,
                      price: item.price
                    })),
                    customer_email: checkoutData.contactInfo.email,
                    customer_phone: checkoutData.contactInfo.phone,
                    customer_name: checkoutData.contactInfo.name,
                    payment_method: checkoutData.paymentMethod === 'cash' ? 'Pago contra entrega' : 'Transferencia bancaria',
                    shipping_method: checkoutData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda',
                    subtotal: subtotal,
                    shipping_amount: shippingAmount,
                    total_amount: totalAmount,
                    notes: checkoutData.contactInfo.notes || '',
                    address: checkoutData.deliveryType === 'delivery' ? checkoutData.contactInfo.address : null
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

      // Crear mensaje de WhatsApp
      const orderSummary = items.map(item => 
        `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`
      ).join('\n');

      const finalOrderNumber = orderResult?.order_number || `TEMP-${Date.now()}`;
      
                        const message = `🛍️ *Nueva Orden - Wildshot Games*\n` +
                    `📋 *Número de Orden:* ${finalOrderNumber}\n\n` +
                    `👤 *Información de Contacto:*\n` +
                    `Nombre: ${checkoutData.contactInfo.name}\n` +
                    `Email: ${checkoutData.contactInfo.email}\n` +
                    `Teléfono: ${checkoutData.contactInfo.phone}\n\n` +
                    `📦 *Productos:*\n${orderSummary}\n\n` +
                    `💰 *Resumen de Precios:*\n` +
                    `Subtotal: ${formatPrice(subtotal)}\n` +
                    `${checkoutData.deliveryType === 'delivery' ? `Envío: ${formatPrice(shippingAmount)}\n` : 'Recoger en tienda: Sin costo\n'}` +
                    `${discount > 0 ? `Descuento (5%): -${formatPrice(discount)}\n` : ''}` +
                    `*Total: ${formatPrice(totalAmount)}*\n\n` +
                    `🚚 *Tipo de Entrega:* ${checkoutData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en tienda'}\n` +
                    `${checkoutData.deliveryType === 'delivery' ? `📍 Dirección: ${checkoutData.contactInfo.address}\n` : ''}` +
                    `💳 *Método de Pago:* ${checkoutData.paymentMethod === 'cash' ? 'Pago contra entrega' : 'Transferencia bancaria'}\n` +
                    `${checkoutData.contactInfo.notes ? `📝 Notas adicionales: ${checkoutData.contactInfo.notes}` : ''}`;

      const whatsappUrl = `https://wa.me/573123456789?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Limpiar carrito después de la orden exitosa
      clearCart();
      
      // Guardar el número de orden y ir al paso de éxito
      setOrderNumber(finalOrderNumber);
      
      if (isAuthenticated) {
        toast.success(`¡Orden ${finalOrderNumber} creada exitosamente! Te contactaremos pronto por WhatsApp.`);
      } else {
        toast.success('¡Orden enviada! Te contactaremos pronto por WhatsApp.');
      }

      // Ir al paso de éxito en lugar de redirigir
      setCurrentStep(STEPS.ORDER_SUCCESS);

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Hubo un error al crear la orden. Por favor intenta nuevamente.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.USER_TYPE:
        return (
          <UserTypeSelection
            userType={checkoutData.userType}
            onUserTypeSelect={(type) => updateCheckoutData('userType', type)}
            onNext={goToNextStep}
          />
        );
      
      case STEPS.DELIVERY_TYPE:
        return (
          <DeliveryTypeSelection
            deliveryType={checkoutData.deliveryType}
            onDeliveryTypeSelect={(type) => updateCheckoutData('deliveryType', type)}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );
      
      case STEPS.CONTACT_INFO:
        return (
          <ContactForm
            contactInfo={checkoutData.contactInfo}
            deliveryType={checkoutData.deliveryType}
            userType={checkoutData.userType}
            onContactInfoUpdate={(info) => updateCheckoutData('contactInfo', info)}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
            user={user}
            isAuthenticated={isAuthenticated}
          />
        );
      
      case STEPS.PAYMENT_METHOD:
        return (
          <PaymentMethodSelection
            paymentMethod={checkoutData.paymentMethod}
            onPaymentMethodSelect={(method) => updateCheckoutData('paymentMethod', method)}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        );
      
      case STEPS.CONFIRMATION:
        return (
          <OrderConfirmation
            checkoutData={checkoutData}
            items={items}
            onConfirm={handleSubmitOrder}
            onBack={goToPreviousStep}
            formatPrice={formatPrice}
          />
        );
      
      case STEPS.ORDER_SUCCESS:
        return (
          <OrderSuccess
            checkoutData={checkoutData}
            orderNumber={orderNumber}
            isAuthenticated={isAuthenticated}
          />
        );
      
      default:
        return null;
    }
  };

  // Pasos a mostrar en la barra de progreso (excluyendo ORDER_SUCCESS)
  const progressSteps = [
    STEPS.USER_TYPE,
    STEPS.DELIVERY_TYPE,
    STEPS.CONTACT_INFO,
    STEPS.PAYMENT_METHOD,
    STEPS.CONFIRMATION
  ];

  return (
    <div className={styles.checkoutFlow}>
      {/* Progress Bar - Solo mostrar si no estamos en ORDER_SUCCESS */}
      {currentStep !== STEPS.ORDER_SUCCESS && (
        <div className={styles.progressBar}>
          <div className={styles.progressSteps}>
            {progressSteps.map((step, index) => (
              <div
                key={step}
                className={`${styles.progressStep} ${
                  progressSteps.indexOf(currentStep) >= index ? styles.active : ''
                }`}
              >
                <div className={styles.stepNumber}>{index + 1}</div>
                <span className={styles.stepLabel}>
                  {step === STEPS.USER_TYPE && 'Tipo de Usuario'}
                  {step === STEPS.DELIVERY_TYPE && 'Tipo de Entrega'}
                  {step === STEPS.CONTACT_INFO && 'Información'}
                  {step === STEPS.PAYMENT_METHOD && 'Pago'}
                  {step === STEPS.CONFIRMATION && 'Confirmar'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Step Content */}
      <div className={styles.stepContent}>
        {renderCurrentStep()}
      </div>
    </div>
  );
}
