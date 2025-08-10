'use client';

import { useEffect } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import styles from './error.module.css';

export default function CatalogError({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Catalog error:', error);
  }, [error]);

  return (
    <>
      <Header />
      <main className={styles.errorMain}>
        <div className={styles.container}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>
              <Icon name="error_outline" size={80} />
            </div>
            
            <h1 className={styles.errorTitle}>
              Algo salió mal
            </h1>
            
            <p className={styles.errorMessage}>
              No pudimos cargar el catálogo de productos. Esto puede deberse a un problema temporal o a un error en el servidor.
            </p>
            
            <div className={styles.errorActions}>
              <button 
                className={styles.retryButton}
                onClick={reset}
              >
                <Icon name="refresh" size={20} />
                Intentar nuevamente
              </button>
              
              <button 
                className={styles.homeButton}
                onClick={() => window.location.href = '/'}
              >
                <Icon name="home" size={20} />
                Ir al inicio
              </button>
            </div>
            
            <div className={styles.errorDetails}>
              <details>
                <summary>Detalles del error</summary>
                <pre className={styles.errorStack}>
                  {error.message || 'Error desconocido'}
                </pre>
              </details>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
