'use client';

import { useState } from 'react';
import styles from './test-email.module.css';

const iconStyle = { fontSize: 18, verticalAlign: 'middle' };

export default function TestEmailPage() {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || 'Error al enviar correos de prueba');
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.container}>
        <h1>Página no disponible en producción</h1>
        <p>Esta página de prueba solo está disponible en el entorno de desarrollo.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          <span className="material-symbols-outlined" style={iconStyle}>science</span>{' '}
          Prueba de Correos Electrónicos
        </h1>
        <p className={styles.description}>
          Esta herramienta te permite probar el sistema de notificaciones por correo 
          electrónico usando datos de un pedido simulado.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="testEmail" className={styles.label}>
              <span className="material-symbols-outlined" style={iconStyle}>mail</span>{' '}
              Email de prueba:
            </label>
            <input
              type="email"
              id="testEmail"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu-email@ejemplo.com"
              required
              className={styles.input}
              disabled={isLoading}
            />
            <small className={styles.hint}>
              Se enviará un correo de confirmación a este email y otro de notificación al administrador.
            </small>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !testEmail}
            className={styles.button}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined" style={iconStyle}>send</span>
                {' '}Enviando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={iconStyle}>rocket_launch</span>
                {' '}Enviar Correos de Prueba
              </>
            )}
          </button>
        </form>

        {error && (
          <div className={styles.error}>
            <h3>
              <span className="material-symbols-outlined" style={iconStyle}>error</span> Error
            </h3>
            <p>{error}</p>
            <details className={styles.details}>
              <summary>
                <span className="material-symbols-outlined" style={iconStyle}>lightbulb</span>{' '}
                Posibles soluciones:
              </summary>
              <ul>
                <li>Verifica que las variables de entorno de Brevo estén configuradas</li>
                <li>Asegúrate de que la API key de Brevo sea válida</li>
                <li>Comprueba tu conexión a internet</li>
                <li>Revisa los logs del servidor para más detalles</li>
              </ul>
            </details>
          </div>
        )}

        {results && (
          <div className={styles.results}>
            <h3>
              <span className="material-symbols-outlined" style={iconStyle}>bar_chart</span> Resultados del Envío
            </h3>
            
            <div className={styles.resultItem}>
              <strong>
                <span className="material-symbols-outlined" style={iconStyle}>mail</span> Correo al Cliente:
              </strong>
              <span className={results.results.customerEmail.sent ? styles.success : styles.failure}>
                {results.results.customerEmail.sent ? 'Enviado' : 'Error'}
              </span>
              {results.results.customerEmail.error && (
                <p className={styles.errorDetail}>{results.results.customerEmail.error}</p>
              )}
            </div>

            <div className={styles.resultItem}>
              <strong>
                <span className="material-symbols-outlined" style={iconStyle}>mail</span> Correo al Administrador:
              </strong>
              <span className={results.results.adminEmail.sent ? styles.success : styles.failure}>
                {results.results.adminEmail.sent ? 'Enviado' : 'Error'}
              </span>
              {results.results.adminEmail.error && (
                <p className={styles.errorDetail}>{results.results.adminEmail.error}</p>
              )}
            </div>

            <div className={styles.summary}>
              <p>
                <strong>
                  <span className="material-symbols-outlined" style={iconStyle}>assignment</span> Número de pedido de prueba:
                </strong>{' '}
                {results.orderNumber}
              </p>
              <p>
                <strong>
                  <span className="material-symbols-outlined" style={iconStyle}>trending_up</span> Total enviados:
                </strong>{' '}
                {results.summary.totalSent} de 2
              </p>
              <p>
                <strong>
                  <span className="material-symbols-outlined" style={iconStyle}>mail</span> Email de prueba:
                </strong>{' '}
                {results.testEmail}
              </p>
            </div>

            {results.summary.totalSent === 2 && (
              <div className={styles.successMessage}>
                <span className="material-symbols-outlined" style={iconStyle}>celebration</span>{' '}
                ¡Todos los correos se enviaron correctamente! Revisa las bandejas de entrada.
              </div>
            )}
          </div>
        )}

        <div className={styles.info}>
          <h3>
            <span className="material-symbols-outlined" style={iconStyle}>info</span> Información
          </h3>
          <ul>
            <li>Esta prueba simula un pedido completo con productos y servicios</li>
            <li>Se envían dos correos: uno al cliente y otro al administrador</li>
            <li>Los correos incluyen todos los detalles del pedido simulado</li>
            <li>Esta página solo funciona en desarrollo</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
