import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import styles from './privacidad.module.css';

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className={styles.privacyPage}>
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.title}>Aviso de Privacidad</h1>
            <p className={styles.subtitle}>Dingerbites</p>
            
            <div className={styles.intro}>
              <p className={styles.text}>
                En Dingerbites estamos comprometidos con la protección de los datos personales 
                y la privacidad de nuestros clientes, proveedores y terceros. En cumplimiento a la 
                Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), 
                ponemos a su disposición el presente Aviso de Privacidad.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Responsable del tratamiento de sus datos personales</h2>
              <p className={styles.text}>
                Dingerbites (&ldquo;Responsable&rdquo;) es la persona moral que decide sobre el tratamiento 
                de los datos personales que recaba de usted como &ldquo;Titular&rdquo;.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Domicilio del Responsable</h2>
              <p className={styles.text}>
                El domicilio para recibir notificaciones relacionadas con la protección de datos personales es:
              </p>
              <div className={styles.address}>
                <p><strong>Av. Álvaro Obregón 151</strong></p>
                <p><strong>Colonia Roma Norte</strong></p>
                <p><strong>06700 Ciudad de México, CDMX</strong></p>
                <p>Correo electrónico: <strong>admin@patitomontenegro.com</strong></p>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Finalidades del tratamiento de sus datos personales</h2>
              <p className={styles.text}>
                Su información personal será utilizada para las siguientes finalidades principales, 
                necesarias para la prestación de nuestros productos y servicios:
              </p>
              <ul className={styles.list}>
                <li>Identificarle y contactarle.</li>
                <li>Crear y administrar su cuenta de usuario.</li>
                <li>Procesar pedidos y coordinar envíos.</li>
                <li>Cumplir obligaciones contractuales y legales.</li>
                <li>Evaluar la calidad del servicio.</li>
              </ul>
              <p className={styles.text}>
                De manera adicional, y únicamente con su consentimiento, podremos utilizar su información para:
              </p>
              <ul className={styles.list}>
                <li>Enviarle promociones, descuentos y novedades de nuestros productos.</li>
                <li>Invitarle a eventos o campañas especiales relacionadas con nuestros productos.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Datos personales que recabamos</h2>
              <p className={styles.text}>Recabamos directamente de usted los siguientes datos:</p>
              <ul className={styles.list}>
                <li>Nombre completo</li>
                <li>Dirección de envío</li>
                <li>Correo electrónico</li>
                <li>Número de teléfono</li>
                <li>Historial de compras y preferencias de consumo</li>
              </ul>
              <p className={styles.text}>
                De manera automática, cuando navega en nuestro sitio, recopilamos información técnica 
                (&ldquo;Información del dispositivo&rdquo;), como:
              </p>
              <ul className={styles.list}>
                <li>Dirección IP</li>
                <li>Tipo de navegador y sistema operativo</li>
                <li>Páginas visitadas en nuestro sitio</li>
                <li>Cookies, etiquetas y píxeles de seguimiento (Google Analytics u otros)</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Datos sensibles</h2>
              <p className={styles.text}>
                Dingerbites no solicita ni recaba datos personales sensibles.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Opciones y medios para limitar el uso de datos</h2>
              <p className={styles.text}>
                Puede limitar el uso o divulgación de sus datos personales para fines mercadotécnicos 
                enviando una solicitud al correo: <strong>admin@patitomontenegro.com</strong>.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Derechos ARCO</h2>
              <p className={styles.text}>
                Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al uso de sus datos personales. 
                Para ejercer estos derechos, deberá enviar un correo con:
              </p>
              <ul className={styles.list}>
                <li>Nombre completo y datos de contacto.</li>
                <li>Copia de identificación oficial (INE o pasaporte).</li>
                <li>Descripción clara del derecho que desea ejercer.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Revocación del consentimiento</h2>
              <p className={styles.text}>
                Puede revocar en cualquier momento el consentimiento otorgado para el tratamiento de sus datos, 
                enviando su solicitud al correo electrónico antes indicado.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Transferencia de datos</h2>
              <p className={styles.text}>Sus datos personales podrán ser compartidos únicamente con:</p>
              <ul className={styles.list}>
                <li>Proveedores de servicios de paquetería y mensajería.</li>
                <li>Proveedores tecnológicos que dan soporte al sitio web.</li>
              </ul>
              <p className={styles.text}>
                En ningún caso venderemos, alquilaremos o compartiremos sus datos con terceros 
                no relacionados con nuestras operaciones.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Medidas de seguridad</h2>
              <p className={styles.text}>
                Adoptamos medidas técnicas, administrativas y físicas para proteger sus datos 
                contra daño, pérdida, alteración, acceso o tratamiento no autorizado.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Modificaciones al Aviso de Privacidad</h2>
              <p className={styles.text}>
                Podremos modificar este Aviso de Privacidad en cualquier momento. La versión 
                actualizada estará disponible en: <strong>www.patitomontenegro.com/privacidad</strong>.
              </p>
            </div>

            <div className={styles.lastUpdated}>
              <p>Última actualización: {new Date().toLocaleDateString('es-MX')}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
