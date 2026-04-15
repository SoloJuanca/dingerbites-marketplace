'use client';

import styles from './PaymentMethodSelection.module.css';

export default function PaymentMethodSelection({ 
  paymentMethod, 
  onPaymentMethodSelect, 
  onNext, 
  onBack 
}) {
  const handlePaymentMethodSelect = (method) => {
    onPaymentMethodSelect(method);
  };

  return (
    <div className={styles.paymentMethodSelection}>
      <div className={styles.header}>
        <h2>Método de Pago</h2>
        <p>Elige cómo quieres pagar tu pedido</p>
      </div>

      <div className={styles.options}>
        <div
          className={`${styles.option} ${paymentMethod === 'cash' ? styles.selected : ''}`}
          onClick={() => handlePaymentMethodSelect('cash')}
        >
          <div className={styles.optionIcon}><span className="material-symbols-outlined">payments</span></div>
          <div className={styles.optionContent}>
            <h3>Pago Contra Entrega</h3>
            <p>Paga cuando recibas tu pedido</p>
            <div className={styles.paymentInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Método:</span>
                <span className={styles.infoValue}>Efectivo</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Costo:</span>
                <span className={styles.infoValue}>Sin cargo</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Disponible:</span>
                <span className={styles.infoValue}>Siempre</span>
              </div>
            </div>
            <ul>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Paga solo cuando recibas tu pedido</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Sin cargos adicionales</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Método más seguro para compras online</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Puedes revisar antes de pagar</li>
            </ul>
          </div>
        </div>

        <div
          className={`${styles.option} ${paymentMethod === 'transfer' ? styles.selected : ''}`}
          onClick={() => handlePaymentMethodSelect('transfer')}
        >
          <div className={styles.optionIcon}><span className="material-symbols-outlined">account_balance</span></div>
          <div className={styles.optionContent}>
            <h3>Transferencia Bancaria</h3>
            <p>Paga por adelantado con descuento</p>
            <div className={styles.paymentInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Método:</span>
                <span className={styles.infoValue}>Transferencia</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Descuento:</span>
                <span className={styles.infoValue}>5% OFF</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Procesamiento:</span>
                <span className={styles.infoValue}>Inmediato</span>
              </div>
            </div>
            <ul>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> 5% de descuento en tu pedido</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Procesamiento inmediato</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Sin esperas para confirmación</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Ideal para pedidos grandes</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.bankInfo}>
        <h4><span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>account_balance</span> Información Bancaria</h4>
        <div className={styles.bankDetails}>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>Banco:</span>
            <span className={styles.bankValue}>Banco Azteca</span>
          </div>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>Titular:</span>
            <span className={styles.bankValue}>Dingerbites S.A. de C.V.</span>
          </div>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>Cuenta:</span>
            <span className={styles.bankValue}>1234 5678 9012 3456</span>
          </div>
          <div className={styles.bankRow}>
            <span className={styles.bankLabel}>CLABE:</span>
            <span className={styles.bankValue}>127 123 456 789 012 345</span>
          </div>
        </div>
        <div className={styles.transferNote}>
          <p><strong>Importante:</strong> Envía el comprobante de transferencia por WhatsApp al (55) 1234-5678</p>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.backButton} onClick={onBack}>
          Atrás
        </button>
        <button
          className={`${styles.nextButton} ${!paymentMethod ? styles.disabled : ''}`}
          onClick={onNext}
          disabled={!paymentMethod}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
