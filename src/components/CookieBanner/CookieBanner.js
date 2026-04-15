'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '../Icon/Icon';
import styles from './CookieBanner.module.css';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya aceptó las cookies
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      // Mostrar el banner después de un pequeño delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  };

  const handleReject = () => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem('cookieConsent', 'rejected');
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`${styles.cookieBanner} ${isClosing ? styles.closing : ''}`}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.iconSection}>
            <Icon name="cookie" size={32} className={styles.cookieIcon} />
          </div>
          
          <div className={styles.textSection}>
            <h3 className={styles.title}>Uso de Cookies</h3>
            <p className={styles.description}>
              Utilizamos cookies para mejorar tu experiencia de navegación, analizar el tráfico del sitio 
              y personalizar el contenido. Al continuar navegando, aceptas nuestro uso de cookies.
            </p>
            <p className={styles.links}>
              Consulta nuestra{' '}
              <Link href="/privacidad" className={styles.link}>
                Política de Privacidad
              </Link>
              {' '}y{' '}
              <Link href="/terminos" className={styles.link}>
                Términos y Condiciones
              </Link>
              {' '}para más información.
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button 
            onClick={handleReject}
            className={`${styles.button} ${styles.rejectButton}`}
          >
            Rechazar
          </button>
          <button 
            onClick={handleAccept}
            className={`${styles.button} ${styles.acceptButton}`}
          >
            <Icon name="check" size={16} />
            Aceptar Cookies
          </button>
        </div>

        <button 
          onClick={handleClose}
          className={styles.closeButton}
          aria-label="Cerrar banner"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
    </div>
  );
}
