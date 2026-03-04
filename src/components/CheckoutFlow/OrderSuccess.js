'use client';

import { useRouter } from 'next/navigation';
import styles from './OrderSuccess.module.css';

export default function OrderSuccess({ 
  checkoutData, 
  orderNumber,
  isAuthenticated 
}) {
  const router = useRouter();

  const handleContinueShopping = () => {
    router.push('/catalog');
  };

  const handleGoToProfile = () => {
    router.push('/profile');
  };

  const handleGoToHome = () => {
    router.push('/');
  };

  return (
    <div className={styles.orderSuccess}>
      <div className={styles.successIcon}>
        🎉
      </div>
      
      <div className={styles.header}>
        <h2>¡Orden Completada Exitosamente!</h2>
        {orderNumber && (
          <p className={styles.orderNumber}>
            Número de orden: <strong>{orderNumber}</strong>
          </p>
        )}
      </div>

      <div className={styles.successMessage}>
        <div className={styles.messageBox}>
          <h3>✅ ¿Qué sigue ahora?</h3>
          <ul className={styles.nextSteps}>
            <li>
              <strong>📱 WhatsApp:</strong> Recibirás confirmación de tu pedido por WhatsApp
            </li>
            {checkoutData.paymentMethod === 'transfer' && (
              <li>
                <strong>💳 Transferencia:</strong> Agrega el número de pedido ({orderNumber}) en el concepto. Banco BBVA. Envía el comprobante por WhatsApp.
              </li>
            )}
            <li>
              <strong>📧 Confirmación:</strong> Se enviará mensaje por correo y teléfono para confirmar el día de entrega
            </li>
            {checkoutData.deliveryType === 'delivery' && (
              <li>
                <strong>🚚 Envío:</strong> Tiempo estimado de 1-2 días hábiles
              </li>
            )}
            {checkoutData.deliveryType === 'pickup' && (
              <li>
                <strong>🏪 Recoger en punto:</strong> Te notificaremos cuando esté listo
              </li>
            )}
            <li>
              <strong>📞 Contacto:</strong> Cualquier duda al (55) 1234-5678
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.actions}>
        {/* Opciones para usuarios invitados */}
        {!isAuthenticated && (
          <div className={styles.guestActions}>
            <h4>¿Qué te gustaría hacer ahora?</h4>
            <button 
              className={styles.primaryButton} 
              onClick={handleContinueShopping}
            >
              🛍️ Seguir Comprando
            </button>
            <button 
              className={styles.secondaryButton} 
              onClick={handleGoToHome}
            >
              🏠 Ir al Inicio
            </button>
          </div>
        )}

        {/* Opciones para usuarios registrados */}
        {isAuthenticated && (
          <div className={styles.userActions}>
            <h4>¿Qué te gustaría hacer ahora?</h4>
            <div className={styles.buttonGroup}>
              <button 
                className={styles.primaryButton} 
                onClick={handleContinueShopping}
              >
                🛍️ Seguir Comprando
              </button>
              <button 
                className={styles.secondaryButton} 
                onClick={handleGoToProfile}
              >
                👤 Ver Mi Perfil
              </button>
              <button 
                className={styles.tertiaryButton} 
                onClick={handleGoToHome}
              >
                🏠 Ir al Inicio
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.thankYouMessage}>
        <p>
          <strong>¡Gracias por tu compra en Dingerbites!</strong>
        </p>
        <p>
          Esperamos que disfrutes tus productos. 
          {!isAuthenticated && (
            <span> ¿Te gustaría <a href="/auth/register" className={styles.registerLink}>crear una cuenta</a> para futuras compras más rápidas?</span>
          )}
        </p>
      </div>
    </div>
  );
}
