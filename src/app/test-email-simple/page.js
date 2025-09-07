'use client';

import { useState } from 'react';
import styles from './test-email-simple.module.css';

export default function TestEmailSimplePage() {
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
      const response = await fetch('/api/test-email-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResults(data);
      } else {
        setError({
          message: data.error || 'Error desconocido',
          details: data,
          step: data.step || 'unknown'
        });
      }
    } catch (err) {
      setError({
        message: 'Error de conexión: ' + err.message,
        details: null,
        step: 'network'
      });
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
        <h1 className={styles.title}>✅ Prueba API REST Simple</h1>
        <p className={styles.description}>
          Prueba simplificada usando únicamente la API REST de Brevo. 
          Sin librerías externas, sin complicaciones.
        </p>

        <div className={styles.apiInfo}>
          <h3>🔗 API Endpoint</h3>
          <code>POST https://api.brevo.com/v3/smtp/email</code>
          <p>
            <a 
              href="https://developers.brevo.com/reference/sendtransacemail" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              📚 Ver documentación oficial
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="testEmail" className={styles.label}>
              📧 Email de prueba:
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
              Se enviará un correo de prueba usando la API REST de Brevo.
            </small>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !testEmail}
            className={styles.button}
          >
            {isLoading ? '📤 Enviando...' : '🚀 Enviar Correo'}
          </button>
        </form>

        {error && (
          <div className={styles.error}>
            <h3>❌ Error en: {error.step}</h3>
            <p>{error.message}</p>
            
            {error.details && (
              <details className={styles.details}>
                <summary>🔍 Detalles del error</summary>
                <div className={styles.errorDetails}>
                  
                  {error.details.envCheck && (
                    <div className={styles.checkSection}>
                      <h4>Variables de Entorno:</h4>
                      <ul>
                        {Object.entries(error.details.envCheck).map(([key, value]) => (
                          <li key={key} className={value ? styles.success : styles.failure}>
                            {key}: {value ? '✅' : '❌'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {error.details.apiResponse && (
                    <div className={styles.checkSection}>
                      <h4>Respuesta de la API:</h4>
                      <pre className={styles.codeBlock}>
                        {JSON.stringify(error.details.apiResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className={styles.solutions}>
              <h4>💡 Posibles soluciones:</h4>
              <ul>
                <li>Verifica que BREVO_API_KEY esté configurada correctamente</li>
                <li>Asegúrate de que la API key sea válida en tu cuenta de Brevo</li>
                <li>Comprueba tu conexión a internet</li>
                <li>Verifica que tu cuenta de Brevo esté activa</li>
              </ul>
            </div>
          </div>
        )}

        {results && (
          <div className={styles.results}>
            <h3>🎉 ¡Correo Enviado Exitosamente!</h3>
            
            <div className={styles.successInfo}>
              <p><strong>📧 Destinatario:</strong> {results.data.testEmail}</p>
              <p><strong>📨 ID del Mensaje:</strong> {results.data.messageId}</p>
              <p><strong>🕐 Hora:</strong> {new Date(results.data.timestamp).toLocaleString()}</p>
              <p><strong>📬 Remitente:</strong> {results.data.sender.name} &lt;{results.data.sender.email}&gt;</p>
              <p><strong>📋 Asunto:</strong> {results.data.subject}</p>
              <p><strong>🔧 Método:</strong> API REST Directa</p>
            </div>

            {results.account && (
              <div className={styles.accountInfo}>
                <h4>📊 Información de la Cuenta Brevo</h4>
                <p><strong>Email:</strong> {results.account.email}</p>
                <p><strong>Nombre:</strong> {results.account.name}</p>
                {results.account.company && <p><strong>Empresa:</strong> {results.account.company}</p>}
                <p><strong>Plan:</strong> {results.account.plan || 'N/A'}</p>
                <p><strong>Créditos:</strong> {results.account.emailCredits || 'Ilimitado'}</p>
              </div>
            )}

            <div className={styles.checkSection}>
              <h4>✅ Verificaciones:</h4>
              <ul>
                <li className={styles.success}>Variables de entorno: ✅</li>
                <li className={styles.success}>Conexión con Brevo: ✅</li>
                <li className={styles.success}>Envío de correo: ✅</li>
                <li className={styles.success}>API REST funcionando: ✅</li>
              </ul>
            </div>

            <div className={styles.nextSteps}>
              <h4>🚀 Sistema Listo</h4>
              <p>El sistema de correos está funcionando perfectamente. Ahora:</p>
              <ul>
                <li>Los correos se enviarán automáticamente cuando los clientes hagan pedidos</li>
                <li>El sistema usa únicamente la API REST de Brevo</li>
                <li>No hay dependencias externas que puedan fallar</li>
                <li>Implementación simple y confiable</li>
              </ul>
            </div>
          </div>
        )}

        <div className={styles.info}>
          <h3>ℹ️ Ventajas de esta implementación</h3>
          <ul>
            <li><strong>Simple:</strong> Solo usa fetch() y la API REST</li>
            <li><strong>Confiable:</strong> Sin dependencias externas</li>
            <li><strong>Mantenible:</strong> Código fácil de entender</li>
            <li><strong>Oficial:</strong> Basado en la documentación de Brevo</li>
            <li><strong>Rápido:</strong> Menos overhead que las librerías</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
