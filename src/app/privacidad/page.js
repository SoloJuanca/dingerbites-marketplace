import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import styles from './privacidad.module.css';

export default function PrivacidadPage() {
  const lastUpdated = '22/04/2026';

  return (
    <>
      <Header />
      <main className={styles.privacyPage}>
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.title}>Aviso de Privacidad Integral</h1>
            <p className={styles.subtitle}>Dingerbites</p>
            
            <div className={styles.intro}>
              <p className={styles.text}>
                En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los
                Particulares (LFPDPPP), Dingerbites pone a disposición el presente Aviso de Privacidad.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>1. Identidad y domicilio del responsable</h2>
              <p className={styles.text}>
                Dingerbites es responsable del tratamiento de los datos personales recabados a través de
                su sitio web, redes sociales y canales de venta.
              </p>
              <p className={styles.text}>
                Correo de contacto:{' '}
                <a href="mailto:contacto@dingerbites.com">contacto@dingerbites.com</a>
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>2. Datos personales recabados</h2>
              <p className={styles.text}>Los datos que podemos recabar incluyen:</p>
              <ul className={styles.list}>
                <li>Nombre completo</li>
                <li>Correo electrónico</li>
                <li>Número telefónico</li>
                <li>Dirección de envío</li>
                <li>Información de navegación (cookies, session context, comportamiento en el sitio)</li>
              </ul>
              <p className={styles.text}>
                No recopilamos directamente datos bancarios o financieros sensibles.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>3. Finalidades del tratamiento</h2>
              <p className={styles.text}><strong>Finalidades primarias</strong></p>
              <ul className={styles.list}>
                <li>Procesar compras y pagos</li>
                <li>Gestionar envíos</li>
                <li>Dar seguimiento a pedidos</li>
                <li>Brindar atención al cliente</li>
              </ul>
              <p className={styles.text}><strong>Finalidades secundarias</strong></p>
              <ul className={styles.list}>
                <li>Envío de promociones y publicidad</li>
                <li>Análisis de comportamiento de usuarios</li>
                <li>Mejora del sitio web</li>
                <li>Personalización de contenido</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>4. Uso de tecnologías de rastreo (cookies)</h2>
              <p className={styles.text}>Dingerbites utiliza cookies y tecnologías similares, incluyendo:</p>
              <ul className={styles.list}>
                <li>Cookies de sesión</li>
                <li>Pixel de Meta (Facebook/Instagram)</li>
                <li>Herramientas de analítica y medición (ej. Google Analytics)</li>
              </ul>
              <p className={styles.text}>
                Estas tecnologías permiten analizar comportamiento, medir campañas publicitarias,
                personalizar anuncios, y mejorar la experiencia del sitio. El usuario puede deshabilitar
                estas tecnologías desde su navegador.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>5. Publicidad y remarketing (Google Ads y Meta Ads)</h2>
              <p className={styles.text}>
                Dingerbites utiliza herramientas de publicidad digital como Google Ads y Meta Ads
                (Facebook e Instagram). Estas plataformas pueden recopilar información mediante cookies o
                identificadores para mostrar anuncios personalizados, medir conversiones y realizar
                remarketing.
              </p>
              <p className={styles.text}>
                El usuario puede administrar sus preferencias en Google Ads Settings y Facebook Ad Preferences.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>6. Transferencia de datos</h2>
              <p className={styles.text}>Dingerbites no vende datos personales.</p>
              <p className={styles.text}>Podrá compartir información únicamente con:</p>
              <ul className={styles.list}>
                <li>Proveedores de pago (Stripe)</li>
                <li>Servicios de mensajería</li>
                <li>
                  Plataformas publicitarias (Google y Meta, de forma anonimizada o mediante cookies)
                </li>
                <li>Autoridades cuando sea requerido por ley</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>7. Derechos ARCO</h2>
              <p className={styles.text}>
                El titular de los datos podrá ejercer sus derechos de Acceso, Rectificación, Cancelación u
                Oposición mediante solicitud al correo:{' '}
                <a href="mailto:contacto@dingerbites.com">contacto@dingerbites.com</a>
              </p>
              <p className={styles.text}>La solicitud deberá incluir:</p>
              <ul className={styles.list}>
                <li>Nombre completo</li>
                <li>Descripción de la solicitud</li>
                <li>Medio de contacto</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>8. Revocación del consentimiento</h2>
              <p className={styles.text}>
                El usuario puede revocar su consentimiento para el uso de sus datos en cualquier momento
                enviando un correo a:{' '}
                <a href="mailto:contacto@dingerbites.com">contacto@dingerbites.com</a>
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>9. Limitación del uso o divulgación</h2>
              <p className={styles.text}>
                El usuario puede solicitar dejar de recibir publicidad o promociones mediante el mismo correo:
                <br />
                <a href="mailto:contacto@dingerbites.com">contacto@dingerbites.com</a>
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>10. Conservación de datos</h2>
              <p className={styles.text}>
                Los datos personales serán conservados únicamente durante el tiempo necesario para cumplir con
                las finalidades descritas y obligaciones legales.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>11. Seguridad</h2>
              <p className={styles.text}>
                Dingerbites implementa medidas de seguridad administrativas, técnicas y físicas para proteger
                la información.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>12. Cambios al aviso</h2>
              <p className={styles.text}>
                Dingerbites se reserva el derecho de modificar este aviso en cualquier momento. Las
                modificaciones serán publicadas en el sitio web.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>13. Consentimiento</h2>
              <p className={styles.text}>
                El uso del sitio web implica la aceptación del presente Aviso de Privacidad.
              </p>
            </div>

            <div className={styles.lastUpdated}>
              <p>Última actualización: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
