'use client';

import styles from './DeliveryTypeSelection.module.css';

export default function DeliveryTypeSelection({ deliveryType, onDeliveryTypeSelect, onNext, onBack }) {
  const handleDeliveryTypeSelect = (type) => {
    onDeliveryTypeSelect(type);
  };

  return (
    <div className={styles.deliveryTypeSelection}>
      <div className={styles.header}>
        <h2>¿Cómo quieres recibir tu pedido?</h2>
        <p>Elige la opción que mejor se adapte a tus necesidades</p>
      </div>

      <div className={styles.options}>
        <div 
          className={`${styles.option} ${deliveryType === 'delivery' ? styles.selected : ''}`}
          onClick={() => handleDeliveryTypeSelect('delivery')}
        >
          <div className={styles.optionIcon}>🚚</div>
          <div className={styles.optionContent}>
            <h3>Envío a Domicilio</h3>
            <p>Recibe tu pedido en la puerta de tu casa</p>
            <div className={styles.deliveryInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Costo:</span>
                <span className={styles.infoValue}>$120 MXN</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tiempo:</span>
                <span className={styles.infoValue}>1-2 días hábiles</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Cobertura:</span>
                <span className={styles.infoValue}>Toda la ciudad</span>
              </div>
            </div>
            <ul>
              <li>✓ Envío seguro y rastreado</li>
              <li>✓ Entrega en horario de tu preferencia</li>
              <li>✓ Notificaciones de estado</li>
            </ul>
          </div>
        </div>

        <div 
          className={`${styles.option} ${deliveryType === 'pickup' ? styles.selected : ''}`}
          onClick={() => handleDeliveryTypeSelect('pickup')}
        >
          <div className={styles.optionIcon}>🏪</div>
          <div className={styles.optionContent}>
            <h3>Recoger en Tienda</h3>
            <p>Pasa por tu pedido en nuestro local</p>
            <div className={styles.pickupInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Costo:</span>
                <span className={styles.infoValue}>Gratis</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tiempo:</span>
                <span className={styles.infoValue}>30 min - 2 horas</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Horario:</span>
                <span className={styles.infoValue}>Lun-Sáb 9:00-20:00</span>
              </div>
            </div>
            <ul>
              <li>✓ Sin costo adicional</li>
              <li>✓ Recogida rápida</li>
              <li>✓ Puedes revisar tu pedido</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.storeInfo}>
        <h4>📍 Nuestra Ubicación</h4>
        <p>Av. Principal #123, Centro Histórico</p>
        <p>Ciudad de México, CDMX</p>
        <p>📞 (55) 1234-5678</p>
      </div>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={onBack}>
          Atrás
        </button>
        <button
          className={`${styles.nextButton} ${!deliveryType ? styles.disabled : ''}`}
          onClick={onNext}
          disabled={!deliveryType}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
