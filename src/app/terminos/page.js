import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import styles from './terminos.module.css';

export default function TerminosPage() {
  return (
    <>
      <Header />
      <main className={styles.termsPage}>
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.title}>Términos y Condiciones</h1>
            <p className={styles.subtitle}>Wildshot Games</p>
            
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>1. Objeto</h2>
              <p className={styles.text}>
                Los presentes Términos regulan el acceso y uso del sitio web Wildshot Games, 
                dedicado a la venta de productos de uñas y maquillaje.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>2. Registro de usuarios</h2>
              <ul className={styles.list}>
                <li>El usuario se compromete a proporcionar información veraz y mantenerla actualizada.</li>
                <li>Es responsable de la confidencialidad de su contraseña y de las actividades realizadas con su cuenta.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>3. Productos y disponibilidad</h2>
              <ul className={styles.list}>
                <li>Todos los productos mostrados están sujetos a disponibilidad.</li>
                <li>Nos reservamos el derecho de modificar precios o descontinuar productos sin previo aviso.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>4. Pedidos y envíos</h2>
              <ul className={styles.list}>
                <li>El usuario deberá proporcionar una dirección válida de entrega.</li>
                <li>Los envíos se realizan mediante paqueterías externas, por lo que los tiempos pueden variar.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>5. Pagos</h2>
              <p className={styles.text}>
                Actualmente, el sitio no procesa pagos en línea. En el futuro, se integrarán 
                pasarelas seguras como Stripe.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>6. Comunicaciones</h2>
              <ul className={styles.list}>
                <li>El usuario acepta recibir notificaciones sobre el estado de sus pedidos.</li>
                <li>Podrá dar su consentimiento opcional para recibir promociones y campañas de marketing.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>7. Propiedad intelectual</h2>
              <p className={styles.text}>
                El contenido del sitio (marcas, logotipos, imágenes, diseños y textos) es 
                propiedad de Wildshot Games o de sus respectivos titulares.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>8. Responsabilidad</h2>
              <p className={styles.text}>
                Wildshot Games no se hace responsable por el mal uso de los productos 
                adquiridos ni por retrasos atribuibles a las paqueterías externas.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>9. Modificaciones</h2>
              <p className={styles.text}>
                Nos reservamos el derecho de actualizar los presentes Términos y Condiciones 
                en cualquier momento. La versión vigente estará publicada en: 
                <strong> www.patitomontenegro.com/terminos</strong>.
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
