'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import AddressManager from '../AddressManager/AddressManager';
import StripeEmbeddedPayment from '../StripeEmbeddedPayment/StripeEmbeddedPayment';
import ProductImage from '../ProductImage/ProductImage';
import {
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo
} from '../../lib/analytics';
import styles from './SimpleCheckout.module.css';

const PICKUP_POINTS = [
  'Galerías Valle Oriente, Monterrey Nuevo León',
  'Walmart Las Torres, Monterrey Nuevo León',
  'Mercado de la Y Griega, Monterrey Nuevo León'
];

export default function SimpleCheckout() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    deliveryType: 'delivery',
    pickupPoint: ''
  });

  const [errors, setErrors] = useState({});
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [shippingQuote, setShippingQuote] = useState({
    status: 'idle',
    options: [],
    packageSummary: null,
    error: ''
  });
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState('');
  const [shippingQuoteRefresh, setShippingQuoteRefresh] = useState(0);
  const [shippingSort, setShippingSort] = useState('price');
  const [shippingCarrierFilter, setShippingCarrierFilter] = useState('all');
  const [checkoutAccordionStep, setCheckoutAccordionStep] = useState('delivery');
  const shippingQuoteRequestIdRef = useRef(0);
  const shippingOptionsRequestedRef = useRef(false);

  const [checkoutStep, setCheckoutStep] = useState(1);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripePublishableKey, setStripePublishableKey] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const prevPaymentIntentIdRef = useRef(null);
  const beginCheckoutFiredRef = useRef(false);
  const paymentInfoFiredRef = useRef(false);

  const { items, getTotalPrice, orderNotes } = useCart();
  const { user, isAuthenticated, apiRequest } = useAuth();

  // Analytics: begin_checkout once when the checkout mounts with items.
  useEffect(() => {
    if (beginCheckoutFiredRef.current) return;
    if (!items || items.length === 0) return;
    beginCheckoutFiredRef.current = true;
    trackBeginCheckout(items, getTotalPrice());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

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
    const trailingNumber = address.address_line_1.match(/^(.*\s)(\d+\s*[A-Za-z]?)$/);

    let street, number;
    if (/^\d+/.test(lastPart)) {
      number = lastPart;
      street = addressParts.slice(0, -1).join(' ');
    } else if (trailingNumber) {
      street = trailingNumber[1].trim();
      number = trailingNumber[2];
    } else {
      street = address.address_line_1;
      number = '';
    }
    
    setFormData(prev => ({
      ...prev,
      street: street,
      number: number,
      neighborhood: address.address_line_2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postal_code || ''
    }));
  };

  // Handle address selection
  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setUseNewAddress(false);
    setShowAddressManager(false);
    setSelectedShippingOptionId('');
    shippingOptionsRequestedRef.current = false;
    populateAddressFields(address);
  };

  const handleInputChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'deliveryType' && value === 'delivery') {
      updates.pickupPoint = '';
    }
    setFormData(prev => ({ ...prev, ...updates }));

    if (['street', 'number', 'neighborhood', 'city', 'state', 'postalCode'].includes(field)) {
      setSelectedAddress(null);
      setUseNewAddress(true);
      setSelectedShippingOptionId('');
      shippingOptionsRequestedRef.current = false;
    }

    if (field === 'deliveryType') {
      setSelectedShippingOptionId('');
      setCheckoutAccordionStep('delivery');
      shippingOptionsRequestedRef.current = false;
    }

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
      if (!formData.street.trim()) newErrors.street = 'La calle es obligatoria';
      if (!formData.number.trim()) newErrors.number = 'El número es obligatorio';
      if (!formData.neighborhood.trim()) newErrors.neighborhood = 'La colonia es obligatoria';
      if (!formData.city.trim()) newErrors.city = 'La ciudad es obligatoria';
      if (!formData.state.trim()) newErrors.state = 'El estado es obligatorio';
      if (!formData.postalCode.trim()) newErrors.postalCode = 'El código postal es obligatorio';
    }

    if (formData.deliveryType === 'pickup') {
      if (!formData.pickupPoint || !formData.pickupPoint.trim()) {
        newErrors.pickupPoint = 'Selecciona un punto de recolección';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getShippingCost = () => {
    if (formData.deliveryType !== 'delivery') return 0;
    return shippingQuote.options.find((option) => option.id === selectedShippingOptionId)?.price || 0;
  };

  const getSubtotal = () => {
    return getTotalPrice();
  };

  const getDiscount = () => {
    return couponData?.discount_amount || 0;
  };

  const getTotal = () => {
    return getSubtotal() + getShippingCost() - getDiscount();
  };

  const getShippingLabel = () => {
    if (formData.deliveryType !== 'delivery') return 'Sin costo (recolección)';
    const selectedOption = shippingQuote.options.find((option) => option.id === selectedShippingOptionId);
    if (selectedOption) return formatPrice(selectedOption.price);
    if (shippingQuote.status === 'loading') return 'Calculando…';
    if (shippingQuote.status === 'error') return 'No disponible';
    return 'Se calculará con tu dirección';
  };

  const subtotal = getTotalPrice();
  useEffect(() => {
    if (formData.deliveryType !== 'delivery') {
      shippingOptionsRequestedRef.current = false;
      setShippingQuote({ status: 'idle', options: [], packageSummary: null, error: '' });
      return;
    }

    const requiredAddress = [
      formData.name,
      formData.phone,
      formData.street,
      formData.number,
      formData.neighborhood,
      formData.city,
      formData.state,
      formData.postalCode
    ];
    if (requiredAddress.some((value) => !String(value || '').trim())) {
      shippingOptionsRequestedRef.current = false;
      setShippingQuote({ status: 'idle', options: [], packageSummary: null, error: '' });
      setSelectedShippingOptionId('');
      return;
    }

    const controller = new AbortController();
    const requestId = ++shippingQuoteRequestIdRef.current;
    setShippingQuote({ status: 'loading', options: [], packageSummary: null, error: '' });
    setSelectedShippingOptionId('');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            items: items.map((item) => ({
              product_id: item.id,
              quantity: item.quantity
            })),
            destination: {
              name: formData.name,
              phone: formData.phone,
              street: formData.street,
              number: formData.number,
              district: formData.neighborhood,
              city: formData.city,
              state: formData.state,
              postalCode: formData.postalCode,
              country: 'MX'
            }
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo calcular el envío.');
        if (!Array.isArray(data.options) || data.options.length === 0) {
          throw new Error('Envia no devolvió opciones de envío para esta dirección.');
        }
        if (!controller.signal.aborted && requestId === shippingQuoteRequestIdRef.current) {
          setShippingQuote({
            status: 'quoted',
            options: data.options,
            packageSummary: data.packageSummary || null,
            error: ''
          });
          if (shippingOptionsRequestedRef.current) {
            shippingOptionsRequestedRef.current = false;
            setCheckoutAccordionStep('shipping');
          }
        }
      } catch (error) {
        if (
          error.name !== 'AbortError' &&
          !controller.signal.aborted &&
          requestId === shippingQuoteRequestIdRef.current
        ) {
          shippingOptionsRequestedRef.current = false;
          setShippingQuote({ status: 'error', options: [], packageSummary: null, error: error.message });
        }
      }
    }, 700);

    return () => {
      shippingQuoteRequestIdRef.current += 1;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    formData.deliveryType,
    formData.name,
    formData.phone,
    formData.street,
    formData.number,
    formData.neighborhood,
    formData.city,
    formData.state,
    formData.postalCode,
    subtotal,
    items,
    shippingQuoteRefresh
  ]);

  const validateCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error('Ingresa un código de cupón');
      return;
    }

    if (!formData.email?.trim()) {
      toast.error('Agrega un correo para validar el cupón');
      return;
    }

    setValidatingCoupon(true);
    try {
      const payload = {
        code,
        customer_email: formData.email,
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      };

      const response = isAuthenticated
        ? await apiRequest('/api/orders/validate-coupon', {
            method: 'POST',
            body: JSON.stringify(payload)
          })
        : await fetch('/api/orders/validate-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

      const data = await response.json();
      if (!response.ok || !data.valid) {
        setCouponData(null);
        toast.error(data.error || 'Cupón no válido');
        return;
      }

      setCouponCode(code);
      setCouponData(data.coupon);
      toast.success(`Cupón aplicado: -${formatPrice(data.coupon.discount_amount)}`);
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponData(null);
      toast.error('No se pudo validar el cupón');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCouponData(null);
    setCouponCode('');
    toast.success('Cupón removido');
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
      formData.state,
      formData.postalCode
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  };

  const buildCheckoutOrderPayload = () => ({
    user_id: isAuthenticated ? user.id : null,
    items: items.map((item) => ({
      product_id: item.id,
      quantity: item.quantity
    })),
    customer_email: formData.email,
    customer_phone: formData.phone,
    customer_name: formData.name,
    shipping_method:
      formData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en punto',
    shipping_address_id:
      formData.deliveryType === 'delivery' && selectedAddress && !useNewAddress
        ? selectedAddress.id
        : null,
    shipping_address:
      formData.deliveryType === 'delivery'
        ? {
            name: formData.name,
            phone: formData.phone,
            street: formData.street,
            number: formData.number,
            district: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: 'MX'
          }
        : null,
    shipping_option_id: formData.deliveryType === 'delivery' ? selectedShippingOptionId : null,
    notes: orderNotes || '',
    address:
      formData.deliveryType === 'delivery' ? formatAddress() : formData.pickupPoint || null,
    pickup_point: formData.deliveryType === 'pickup' ? formData.pickupPoint : null,
    coupon_code: couponData?.code || null
  });

  const goToStep2 = () => {
    if (!validateForm()) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }
    if (
      formData.deliveryType === 'delivery' &&
      (shippingQuote.status !== 'quoted' || !selectedShippingOptionId)
    ) {
      toast.error(shippingQuote.error || 'Selecciona una opción de envío de Envia.');
      return;
    }
    // Analytics: shipping info completed.
    trackAddShippingInfo(
      items,
      getTotal(),
      formData.deliveryType === 'delivery' ? 'delivery' : 'pickup'
    );
    setCheckoutStep(2);
  };

  const continueToAddress = () => {
    setCheckoutAccordionStep('address');
  };

  const continueToShipping = () => {
    if (!validateForm()) {
      toast.error('Por favor completa los datos obligatorios.');
      return;
    }
    if (formData.deliveryType === 'delivery') {
      if (shippingQuote.status === 'quoted') {
        setCheckoutAccordionStep('shipping');
        return;
      }
      shippingOptionsRequestedRef.current = true;
      if (shippingQuote.status !== 'loading') {
        setShippingQuoteRefresh((value) => value + 1);
      }
      return;
    }
    goToStep2();
  };

  const getVisibleShippingOptions = () => {
    const options = shippingQuote.options.filter(
      (option) => shippingCarrierFilter === 'all' || option.carrier === shippingCarrierFilter
    );
    return options.sort((a, b) => {
      if (shippingSort === 'speed') {
        const getDays = (option) => {
          if (option.deliveryDays !== null && Number.isFinite(Number(option.deliveryDays))) {
            return Number(option.deliveryDays);
          }
          const estimate = String(option.estimatedDelivery || '');
          const days = estimate.match(/(\d+(?:\.\d+)?)\s*(?:business\s*)?(?:days?|d[ií]as?)/i);
          if (days) return Number(days[1]);
          const deliveryDate = Date.parse(estimate);
          return Number.isNaN(deliveryDate) ? Infinity : Math.max(0, (deliveryDate - Date.now()) / 86400000);
        };
        const aDays = getDays(a);
        const bDays = getDays(b);
        return aDays - bDays || a.price - b.price;
      }
      if (shippingSort === 'carrier') return a.carrier.localeCompare(b.carrier) || a.price - b.price;
      return a.price - b.price;
    });
  };

  useEffect(() => {
    if (checkoutStep !== 2) {
      prevPaymentIntentIdRef.current = null;
      paymentInfoFiredRef.current = false;
      setStripeClientSecret(null);
      setStripePublishableKey(null);
      setStripeError(null);
      return;
    }

    let cancelled = false;

    async function createIntent() {
      setStripeLoading(true);
      setStripeError(null);
      try {
        const payload = {
          ...buildCheckoutOrderPayload(),
          cancel_previous_payment_intent_id: prevPaymentIntentIdRef.current || undefined
        };
        const res = isAuthenticated
          ? await apiRequest('/api/checkout/payment-intent', {
              method: 'POST',
              body: JSON.stringify(payload)
            })
          : await fetch('/api/checkout/payment-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStripeClientSecret(null);
          setStripePublishableKey(null);
          setStripeError(data.error || 'No se pudo preparar el pago');
          return;
        }
        if (
          formData.deliveryType === 'delivery' &&
          Number.isFinite(Number(data.shipping_amount))
        ) {
          setShippingQuote((current) => ({
            ...current,
            status: 'quoted',
            options: current.options.map((option) =>
              option.id === selectedShippingOptionId
                ? { ...option, price: Number(data.shipping_amount) }
                : option
            ),
            error: ''
          }));
        }
        if (data.payment_intent_id) {
          prevPaymentIntentIdRef.current = data.payment_intent_id;
        }
        setStripeClientSecret(data.clientSecret);
        setStripePublishableKey(data.publishableKey);
        // Analytics: payment info step reached (payment form ready) — once per session.
        if (!paymentInfoFiredRef.current) {
          paymentInfoFiredRef.current = true;
          trackAddPaymentInfo(items, getTotal(), 'card');
        }
      } catch (err) {
        if (!cancelled) {
          setStripeError(err.message || 'Error de red');
        }
      } finally {
        if (!cancelled) {
          setStripeLoading(false);
        }
      }
    }

    createIntent();
    return () => {
      cancelled = true;
    };
  }, [
    checkoutStep,
    couponData,
    formData.deliveryType,
    formData.pickupPoint,
    formData.email,
    formData.name,
    formData.phone,
    formData.street,
    formData.number,
    formData.neighborhood,
    formData.city,
    formData.state,
    formData.postalCode,
    orderNotes,
    selectedShippingOptionId,
    selectedAddress,
    useNewAddress,
    items,
    isAuthenticated,
    user?.id
  ]);

  return (
    <div className={styles.simpleCheckout}>
      {/* Header del Checkout */}
      <div className={styles.checkoutHeader}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo-wildshot.png" alt="Logo" width={40} height={40} />
        </Link>
        <Link href="/cart" className={styles.backToCart}>
          ← Volver al Carrito
        </Link>
      </div>

      <div className={styles.stepBar} role="navigation" aria-label="Pasos del checkout">
        <div
          className={`${styles.stepItem} ${checkoutStep === 1 ? styles.stepItemActive : styles.stepItemDone}`}
        >
          <span className={styles.stepNum}>1</span>
          <span>Datos y envío</span>
        </div>
        <div className={styles.stepDivider} aria-hidden />
        <div
          className={`${styles.stepItem} ${checkoutStep === 2 ? styles.stepItemActive : styles.stepItemPending}`}
        >
          <span className={styles.stepNum}>2</span>
          <span>Resumen y pago</span>
        </div>
      </div>

      <div className={styles.header}>
        <h1>Finalizar compra</h1>
        <p>
          {checkoutStep === 1
            ? 'Ingresa tus datos y el tipo de entrega'
            : 'Revisa tu pedido y paga con tarjeta'}
        </p>
      </div>

      <div className={`${styles.content} ${checkoutStep === 1 ? styles.contentStep1 : ''}`}>
        <div className={styles.formSection}>
          {checkoutStep === 1 && (
            <div className={styles.form}>
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
              {checkoutAccordionStep === 'delivery' ? (
                <>
                  <h2>Tipo de Entrega</h2>
                  <div className={styles.deliveryNotice}>
                    <p>Se enviará mensaje por correo electrónico y teléfono para confirmar el día de entrega.</p>
                  </div>
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
                    <strong>Envío a Domicilio</strong> - {getShippingLabel()}
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
                    <strong>Recoger en Punto</strong> - Gratis
                    <small>Elige el punto de recolección más cercano</small>
                  </span>
                </label>
                  </div>
                  <button type="button" className={styles.submitButton} onClick={continueToAddress}>
                    Continuar
                  </button>
                </>
              ) : (
                <div className={styles.accordionSummary}>
                  <div>
                    <h2>Tipo de Entrega</h2>
                    <p>{formData.deliveryType === 'delivery' ? 'Envío a domicilio' : 'Recoger en punto'}</p>
                  </div>
                  <button type="button" className={styles.changeAddressButton} onClick={() => setCheckoutAccordionStep('delivery')}>
                    Editar
                  </button>
                </div>
              )}

              {checkoutAccordionStep === 'address' && formData.deliveryType === 'pickup' && (
                <div className={styles.pickupPointsSection}>
                  <label htmlFor="pickupPoint" className={styles.pickupLabel}>Punto de recolección *</label>
                  <select
                    id="pickupPoint"
                    value={formData.pickupPoint}
                    onChange={(e) => handleInputChange('pickupPoint', e.target.value)}
                    className={`${styles.pickupSelect} ${errors.pickupPoint ? styles.error : ''}`}
                  >
                    <option value="">Selecciona un punto</option>
                    {PICKUP_POINTS.map((point) => (
                      <option key={point} value={point}>{point}</option>
                    ))}
                  </select>
                  {errors.pickupPoint && <span className={styles.errorText}>{errors.pickupPoint}</span>}
                </div>
              )}

              {checkoutAccordionStep === 'address' && formData.deliveryType === 'delivery' && (
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
                        {selectedAddress.phone && <p><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>call</span> {selectedAddress.phone}</p>}
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
                            shippingOptionsRequestedRef.current = false;
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
                      </div>

                      <div className={`${styles.row} ${styles.postalCodeRow}`}>
                        <div className={styles.inputGroup}>
                          <label htmlFor="state">Estado *</label>
                          <input
                            type="text"
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className={errors.state ? styles.error : ''}
                            placeholder="Estado"
                          />
                          {errors.state && <span className={styles.errorText}>{errors.state}</span>}
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

              {checkoutAccordionStep === 'address' && (
                <>
                  {formData.deliveryType === 'delivery' && shippingQuote.status === 'error' && (
                    <p className={styles.errorText} role="alert">{shippingQuote.error}</p>
                  )}
                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={continueToShipping}
                    disabled={formData.deliveryType === 'delivery' && shippingQuote.status === 'loading'}
                  >
                    {formData.deliveryType !== 'delivery'
                      ? 'Continuar'
                      : shippingQuote.status === 'loading'
                        ? 'Cargando opciones de envío…'
                        : shippingQuote.status === 'error'
                          ? 'Reintentar opciones de envío'
                          : 'Ver opciones de envío'}
                  </button>
                </>
              )}

              {checkoutAccordionStep === 'shipping' && formData.deliveryType === 'delivery' && (
                <>
                  <div className={styles.accordionSummary}>
                    <div>
                      <h2>Dirección de Envío</h2>
                      <p>{formatAddress()}</p>
                    </div>
                    <button type="button" className={styles.changeAddressButton} onClick={() => setCheckoutAccordionStep('address')}>
                      Editar
                    </button>
                  </div>
                  <div className={styles.shippingOptionsSection}>
                    <h2>Elige tu envío</h2>
                    <p>Compara precio, tiempo de entrega y paquetería.</p>
                    {shippingQuote.status === 'loading' && <p className={styles.stripeLoading}>Consultando opciones con Envia…</p>}
                    {shippingQuote.status === 'error' && (
                      <div>
                        <p className={styles.errorText} role="alert">{shippingQuote.error}</p>
                        <button
                          type="button"
                          className={styles.changeAddressButton}
                          onClick={() => setShippingQuoteRefresh((value) => value + 1)}
                        >
                          Volver a consultar
                        </button>
                      </div>
                    )}
                    {shippingQuote.status === 'quoted' && (
                      <>
                        {shippingQuote.packageSummary && (
                          <p className={styles.shippingPackageSummary}>
                            Cotización para {shippingQuote.packageSummary.packageCount} paquete
                            {shippingQuote.packageSummary.packageCount === 1 ? '' : 's'}{' '}
                            {shippingQuote.packageSummary.label.toLowerCase()} (
                            {shippingQuote.packageSummary.dimensions.length} ×{' '}
                            {shippingQuote.packageSummary.dimensions.width} ×{' '}
                            {shippingQuote.packageSummary.dimensions.height} cm,{' '}
                            {shippingQuote.packageSummary.weight} kg).
                          </p>
                        )}
                        <div className={styles.shippingFilters}>
                          <label className={styles.inputGroup}>
                            <span>Ordenar por</span>
                            <select value={shippingSort} onChange={(event) => setShippingSort(event.target.value)}>
                              <option value="price">Menor precio</option>
                              <option value="speed">Mayor rapidez</option>
                              <option value="carrier">Paquetería</option>
                            </select>
                          </label>
                          <label className={styles.inputGroup}>
                            <span>Paquetería</span>
                            <select
                              value={shippingCarrierFilter}
                              onChange={(event) => {
                                setShippingCarrierFilter(event.target.value);
                                setSelectedShippingOptionId('');
                              }}
                            >
                              <option value="all">Todas</option>
                              {[...new Set(shippingQuote.options.map((option) => option.carrier))].sort().map((carrier) => (
                                <option key={carrier} value={carrier}>{carrier}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {shippingSort === 'speed' &&
                          shippingQuote.options.every((option) => !option.deliveryDays && !option.estimatedDelivery) && (
                            <p>Envia no proporcionó tiempos estimados; las opciones se ordenan por precio.</p>
                          )}
                        <div className={styles.shippingOptions}>
                          {getVisibleShippingOptions().map((option) => (
                            <label
                              key={option.id}
                              className={`${styles.shippingOption} ${selectedShippingOptionId === option.id ? styles.shippingOptionSelected : ''}`}
                            >
                              <input
                                type="radio"
                                name="shippingOption"
                                value={option.id}
                                checked={selectedShippingOptionId === option.id}
                                onChange={() => setSelectedShippingOptionId(option.id)}
                              />
                              <span className={styles.shippingOptionInfo}>
                                <strong>{option.carrier}</strong>
                                <span>{option.service}</span>
                                {option.estimatedDelivery && <small>Entrega estimada: {option.estimatedDelivery}</small>}
                              </span>
                              <strong className={styles.shippingOptionPrice}>{formatPrice(option.price)}</strong>
                            </label>
                          ))}
                          {getVisibleShippingOptions().length === 0 && (
                            <p>No hay opciones para esta paquetería. Prueba otra o selecciona “Todas”.</p>
                          )}
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={goToStep2}
                      className={styles.submitButton}
                      disabled={
                        !items ||
                        items.length === 0 ||
                        shippingQuote.status !== 'quoted' ||
                        !selectedShippingOptionId
                      }
                    >
                      Continuar al resumen y pago
                    </button>
                  </div>
                </>
              )}
            </div>

            </div>
          )}

          {checkoutStep === 2 && (
            <div className={styles.form}>
            <button
              type="button"
              className={styles.backStep}
              onClick={() => setCheckoutStep(1)}
            >
              ← Volver a datos y envío
            </button>

            <div className={styles.section}>
              <h2>Cupón</h2>
              {couponData ? (
                <div className={styles.cashOnDeliveryRules}>
                  <p>
                    Cupón aplicado: <strong>{couponData.code}</strong> (-{formatPrice(couponData.discount_amount)})
                  </p>
                  <button
                    type="button"
                    className={styles.manageAddressButton}
                    onClick={removeCoupon}
                  >
                    Quitar cupón
                  </button>
                </div>
              ) : (
                <div className={styles.row}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="couponCode">Código de cupón</label>
                    <input
                      type="text"
                      id="couponCode"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Ej: DINGER-AB12CD34"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>&nbsp;</label>
                    <button
                      type="button"
                      className={styles.applyCouponButton}
                      onClick={validateCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                    >
                      {validatingCoupon ? 'Validando...' : 'Aplicar cupón'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.section}>
              <h2>Pago con tarjeta</h2>
              <p className={styles.paymentNotice}>
                Pago seguro con tarjeta de crédito o débito.
              </p>
              {stripeLoading && (
                <p className={styles.stripeLoading}>Preparando formulario de pago…</p>
              )}
              {stripeError && (
                <p className={styles.stripeError} role="alert">
                  {stripeError}
                </p>
              )}
              {!stripeLoading && stripeClientSecret && stripePublishableKey && (
                <StripeEmbeddedPayment
                  key={stripeClientSecret}
                  clientSecret={stripeClientSecret}
                  publishableKey={stripePublishableKey}
                  returnPath="/checkout/success"
                />
              )}
            </div>
          </div>
          )}
        </div>

        {checkoutStep === 2 && (
        <div className={styles.summarySection}>
          <div className={styles.orderSummary}>
            <h2>Resumen del Pedido</h2>
            <div className={styles.items}>
              {items.map((item, index) => (
                <div key={index} className={styles.item}>
                  <ProductImage
                    src={item.image}
                    className={styles.itemImage}
                    alt={item.name}
                    width={50}
                    height={50}
                    isRiftbound={item.is_riftbound}
                  />
                  <span className={styles.itemName}>{item.name.slice(0, 30)}{item.name.length > 30 ? '...' : ''} x{item.quantity}</span>
                  <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Entrega:</span>
                <span>
                  {formData.deliveryType === 'delivery'
                    ? 'Envío a domicilio'
                    : 'Recoger en punto'}
                </span>
              </div>
              {formData.deliveryType === 'delivery' && formatAddress() && (
                <div className={styles.totalRow}>
                  <span>Dirección:</span>
                  <span>{formatAddress()}</span>
                </div>
              )}
              {formData.deliveryType === 'pickup' && formData.pickupPoint && (
                <div className={styles.totalRow}>
                  <span>Punto:</span>
                  <span>{formData.pickupPoint}</span>
                </div>
              )}
              <div className={styles.totalRow}>
                <span>Subtotal:</span>
                <span>{formatPrice(getSubtotal())}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Envío:</span>
                <span>{getShippingLabel()}</span>
              </div>
              {formData.deliveryType === 'delivery' &&
                shippingQuote.options.find((option) => option.id === selectedShippingOptionId) && (
                  <div className={styles.totalRow}>
                    <span>Paquetería:</span>
                    <span>
                      {shippingQuote.options.find((option) => option.id === selectedShippingOptionId).carrier}
                      {' · '}
                      {shippingQuote.options.find((option) => option.id === selectedShippingOptionId).service}
                    </span>
                  </div>
                )}
              {getDiscount() > 0 && (
                <div className={styles.totalRow}>
                  <span>Descuento por cupón:</span>
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
        )}
      </div>
    </div>
  );
}
