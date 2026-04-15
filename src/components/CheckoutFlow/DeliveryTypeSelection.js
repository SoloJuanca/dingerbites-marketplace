'use client';

import styles from './DeliveryTypeSelection.module.css';

const PICKUP_POINTS = [
  'Galerías Valle Oriente, Monterrey Nuevo León',
  'Walmart Las Torres, Monterrey Nuevo León',
  'Mercado de la Y Griega, Monterrey Nuevo León'
];

export default function DeliveryTypeSelection({ deliveryType, pickupPoint, onDeliveryTypeSelect, onPickupPointSelect, onNext, onBack }) {
  const handleDeliveryTypeSelect = (type) => {
    onDeliveryTypeSelect(type);
    if (type === 'delivery') onPickupPointSelect?.('');
  };

  const canContinue = deliveryType && (deliveryType === 'delivery' || (deliveryType === 'pickup' && pickupPoint));

  return (
    <div className={styles.deliveryTypeSelection}>
      <div className={styles.header}>
        <h2>¿Cómo quieres recibir tu pedido?</h2>
        <p>Elige la opción que mejor se adapte a tus necesidades</p>
      </div>

      <div className={styles.deliveryNotice}>
        <p>Se enviará mensaje por correo electrónico y teléfono para confirmar el día de entrega.</p>
      </div>

      <div className={styles.options}>
        <div 
          className={`${styles.option} ${deliveryType === 'delivery' ? styles.selected : ''}`}
          onClick={() => handleDeliveryTypeSelect('delivery')}
        >
          <div className={styles.optionIcon}><span className="material-symbols-outlined">local_shipping</span></div>
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
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Envío seguro y rastreado</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Entrega en horario de tu preferencia</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Notificaciones de estado</li>
            </ul>
          </div>
        </div>

        <div 
          className={`${styles.option} ${deliveryType === 'pickup' ? styles.selected : ''}`}
          onClick={() => handleDeliveryTypeSelect('pickup')}
        >
          <div className={styles.optionIcon}><span className="material-symbols-outlined">storefront</span></div>
          <div className={styles.optionContent}>
            <h3>Recoger en Punto</h3>
            <p>Elige el punto de recolección más cercano</p>
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
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Sin costo adicional</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Recogida rápida</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Puedes revisar tu pedido</li>
            </ul>
          </div>
        </div>
      </div>

      {deliveryType === 'pickup' && (
        <div className={styles.pickupPointsSection}>
          <label htmlFor="pickupPoint" className={styles.pickupLabel}>Punto de recolección *</label>
          <select
            id="pickupPoint"
            value={pickupPoint || ''}
            onChange={(e) => onPickupPointSelect?.(e.target.value)}
            className={styles.pickupSelect}
          >
            <option value="">Selecciona un punto</option>
            {PICKUP_POINTS.map((point) => (
              <option key={point} value={point}>{point}</option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.storeInfo}>
        <h4><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>location_on</span> Puntos de recolección</h4>
        <p>Galerías Valle Oriente • Walmart Las Torres • Mercado de la Y Griega</p>
        <p>Monterrey, Nuevo León</p>
      </div>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={onBack}>
          Atrás
        </button>
        <button
          className={`${styles.nextButton} ${!canContinue ? styles.disabled : ''}`}
          onClick={onNext}
          disabled={!canContinue}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
