'use client';

import Link from 'next/link';
import styles from './UserTypeSelection.module.css';

export default function UserTypeSelection({ userType, onUserTypeSelect, onNext }) {
  const handleUserTypeSelect = (type) => {
    onUserTypeSelect(type);
  };

  return (
    <div className={styles.userTypeSelection}>
      <div className={styles.header}>
        <h2>¿Cómo quieres continuar?</h2>
        <p>Elige la opción que mejor se adapte a ti</p>
      </div>

      <div className={styles.options}>
        <div 
          className={`${styles.option} ${userType === 'guest' ? styles.selected : ''}`}
          onClick={() => handleUserTypeSelect('guest')}
        >
          <div className={styles.optionIcon}><span className="material-symbols-outlined">person</span></div>
          <div className={styles.optionContent}>
            <h3>Continuar como Invitado</h3>
            <p>Completa tu pedido sin crear una cuenta</p>
            <ul>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Proceso rápido y simple</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Sin contraseñas que recordar</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Recibirás confirmación por WhatsApp</li>
            </ul>
          </div>
        </div>

        <div 
          className={`${styles.option} ${userType === 'account' ? styles.selected : ''}`}
          onClick={() => handleUserTypeSelect('account')}
        >
          <div className={styles.optionIcon}><span className="material-symbols-outlined">lock</span></div>
          <div className={styles.optionContent}>
            <h3>Crear una Cuenta</h3>
            <p>Regístrate para beneficios adicionales</p>
            <ul>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Historial de pedidos</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Direcciones guardadas</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Seguimiento de envíos</li>
              <li><span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', color: '#10b981' }}>check</span> Ofertas exclusivas</li>
            </ul>
          </div>
        </div>
      </div>

      {userType === 'account' && (
        <div className={styles.accountActions}>
          <p>¿Ya tienes cuenta?</p>
          <div className={styles.authButtons}>
            <Link href="/auth/login" className={styles.authButton}>
              Iniciar Sesión
            </Link>
            <Link href="/auth/register" className={styles.authButton}>
              Registrarse
            </Link>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={`${styles.nextButton} ${!userType ? styles.disabled : ''}`}
          onClick={onNext}
          disabled={!userType}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
