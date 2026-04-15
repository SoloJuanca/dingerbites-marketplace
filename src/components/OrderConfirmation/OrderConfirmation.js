'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/AuthContext';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import styles from './OrderConfirmation.module.css';

const BBVA_TITULAR = 'María Fernanda Villegas Nieto';

export default function OrderConfirmation({ 
  orderNumber, 
  customerName, 
  customerEmail,
  customerPhone,
  total, 
  deliveryType, 
  pickupPoint,
  paymentMethod,
  estimatedDelivery 
}) {
  const { isAuthenticated, claimGuestAccount } = useAuth();
  const clabe = process.env.NEXT_PUBLIC_BBVA_CLABE || '';
  const cardNumber = process.env.NEXT_PUBLIC_BBVA_CARD_NUMBER || '';

  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [registerErrors, setRegisterErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const nameParts = customerName ? customerName.split(' ') : ['', ''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const validateRegister = () => {
    const errs = {};
    if (!registerData.password || registerData.password.length < 8) {
      errs.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    if (registerData.password !== registerData.confirmPassword) {
      errs.confirmPassword = 'Las contraseñas no coinciden';
    }
    setRegisterErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setIsRegistering(true);
    try {
      const result = await claimGuestAccount({
        email: customerEmail,
        password: registerData.password,
        firstName,
        lastName,
        phone: customerPhone || ''
      });

      console.log(result);

      if (result.success) {
        setRegistered(true);
        toast.success('Cuenta creada exitosamente. Ahora puedes ver tus pedidos.');
      } else {
        toast.error(result.error || 'No se pudo crear la cuenta');
      }
    } catch {
      toast.error('Error al crear la cuenta');
    } finally {
      setIsRegistering(false);
    }
  };

  const isGuest = !isAuthenticated && !registered;

  return (
    <>
      <Header />
      <div className={styles.confirmationContainer}>
      <div className={styles.confirmationCard}>
        <div className={styles.successIcon}>
          <div className={styles.checkmark}><span className="material-symbols-outlined" style={{ fontSize: 48 }}>check</span></div>
        </div>

        <h1 className={styles.title}>¡Pedido Confirmado!</h1>
        <p className={styles.subtitle}>
          Gracias {customerName}, tu pedido ha sido procesado exitosamente
        </p>

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
            {(isAuthenticated || registered) && (
              <li>Puedes seguir el estado de tu pedido en tu perfil</li>
            )}
          </ul>
        </div>

        {/* Guest registration card */}
        {isGuest && !showRegister && (
          <div className={styles.registerPromo}>
            <div className={styles.registerPromoIcon}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>person_add</span>
            </div>
            <h3>Crea tu cuenta para dar seguimiento</h3>
            <p>
              Registra una contraseña y podrás ver el estado de este pedido, guardar direcciones y acceder a ofertas exclusivas.
            </p>
            <button
              type="button"
              className={styles.registerPromoButton}
              onClick={() => setShowRegister(true)}
            >
              Crear mi cuenta
            </button>
          </div>
        )}

        {isGuest && showRegister && (
          <form className={styles.registerForm} onSubmit={handleRegister}>
            <h3 className={styles.registerTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle' }}>lock</span>
              {' '}Crear cuenta
            </h3>

            <div className={styles.registerReadonly}>
              <div className={styles.readonlyField}>
                <span className={styles.readonlyLabel}>Nombre</span>
                <span className={styles.readonlyValue}>{customerName}</span>
              </div>
              <div className={styles.readonlyField}>
                <span className={styles.readonlyLabel}>Email</span>
                <span className={styles.readonlyValue}>{customerEmail}</span>
              </div>
              {customerPhone && (
                <div className={styles.readonlyField}>
                  <span className={styles.readonlyLabel}>Teléfono</span>
                  <span className={styles.readonlyValue}>{customerPhone}</span>
                </div>
              )}
            </div>

            <div className={styles.registerFieldGroup}>
              <label htmlFor="reg-password" className={styles.registerLabel}>Contraseña *</label>
              <input
                id="reg-password"
                type="password"
                value={registerData.password}
                onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                className={`${styles.registerInput} ${registerErrors.password ? styles.registerInputError : ''}`}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              {registerErrors.password && <span className={styles.registerError}>{registerErrors.password}</span>}
            </div>

            <div className={styles.registerFieldGroup}>
              <label htmlFor="reg-confirm" className={styles.registerLabel}>Confirmar contraseña *</label>
              <input
                id="reg-confirm"
                type="password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className={`${styles.registerInput} ${registerErrors.confirmPassword ? styles.registerInputError : ''}`}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
              />
              {registerErrors.confirmPassword && <span className={styles.registerError}>{registerErrors.confirmPassword}</span>}
            </div>

            <div className={styles.registerActions}>
              <button
                type="submit"
                className={styles.registerSubmit}
                disabled={isRegistering}
              >
                {isRegistering ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
              <button
                type="button"
                className={styles.registerCancel}
                onClick={() => setShowRegister(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          {(isAuthenticated || registered) && (
            <Link href="/profile" className={styles.primaryButton}>
              Ver Mis Ordenes
            </Link>
          )}
          <Link href="/" className={isAuthenticated || registered ? styles.secondaryButton : styles.primaryButton}>
            Continuar Comprando
          </Link>
        </div>
      </div>
    </div>
      <Footer />
    </>
  );
}
