import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import styles from './terminos.module.css';

export default function TerminosPage() {
  const lastUpdated = '22/04/2026';

  return (
    <>
      <Header />
      <main className={styles.termsPage}>
        <div className={styles.container}>
          <div className={styles.content}>
            <h1 className={styles.title}>Términos de Servicio y Políticas Comerciales</h1>
            <p className={styles.subtitle}>Dingerbites</p>
            
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>1. Identificación del proveedor</h2>
              <p className={styles.text}>
                Dingerbites es un negocio dedicado a la venta de figuras de anime, gachapon, blind boxes,
                cartas coleccionables (TCG), peluches y productos geek, a través de medios electrónicos y
                ventas presenciales.
              </p>
              <p className={styles.text}>
                Para cualquier aclaración:{' '}
                <a href="mailto:contacto@dingerbites.com">contacto@dingerbites.com</a>
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>2. Información de productos</h2>
              <ul className={styles.list}>
                <li>Todos los productos son descritos con la mayor precisión posible.</li>
                <li>
                  Al tratarse de artículos de colección, pueden existir variaciones menores en color,
                  empaque o detalles.
                </li>
                <li>
                  Las blind boxes contienen productos sorpresa, por lo que su contenido no puede ser
                  elegido previamente.
                </li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>3. Precios y pagos</h2>
              <ul className={styles.list}>
                <li>Todos los precios están expresados en pesos mexicanos (MXN).</li>
                <li>Los pagos se procesan mediante plataformas seguras como Stripe.</li>
                <li>Dingerbites no almacena datos bancarios.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>4. Envíos</h2>
              <ul className={styles.list}>
                <li>
                  Los pedidos serán procesados dentro de un plazo máximo de <strong>72 horas hábiles</strong>{' '}
                  posteriores a la confirmación del pago.
                </li>
                <li>Los envíos se realizan a través de <strong>Correos de México</strong>.</li>
                <li>Una vez enviado el pedido, se proporcionará una guía de seguimiento al cliente.</li>
                <li>
                  Dingerbites no es responsable por retrasos atribuibles a la empresa de mensajería.
                </li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>5. Entrega y recepción</h2>
              <p className={styles.text}>
                El cliente es responsable de:
              </p>
              <ul className={styles.list}>
                <li>Proporcionar datos correctos de envío.</li>
                <li>Recibir el paquete en el domicilio indicado.</li>
              </ul>
              <p className={styles.text}>Se recomienda revisar el paquete al momento de la entrega.</p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>6. Reclamaciones, devoluciones y reembolsos</h2>
              <p className={styles.text}>
                El cliente cuenta con un plazo máximo de <strong>24 horas a partir de la confirmación de entrega</strong>{' '}
                para reportar cualquier inconveniente.
              </p>
              <h3 className={styles.sectionTitle}>6.1 Procedimiento</h3>
              <p className={styles.text}>
                Para iniciar una reclamación, el cliente deberá enviar un correo a:{' '}
                <a href="mailto:contacto@dingerbites.com">contacto@dingerbites.com</a>, incluyendo:
              </p>
              <ul className={styles.list}>
                <li>Número de orden.</li>
                <li>Descripción del problema.</li>
                <li>Evidencia (fotografías o video).</li>
              </ul>
              <h3 className={styles.sectionTitle}>6.2 Casos en los que aplica devolución o reembolso</h3>
              <ul className={styles.list}>
                <li>Producto defectuoso.</li>
                <li>Producto incorrecto.</li>
                <li>Producto dañado durante el envío.</li>
              </ul>
              <h3 className={styles.sectionTitle}>6.3 Casos en los que NO aplica</h3>
              <ul className={styles.list}>
                <li>Productos abiertos o manipulados.</li>
                <li>Blind boxes (productos sorpresa).</li>
                <li>Daños ocasionados por mal uso.</li>
                <li>Solicitudes fuera del plazo de 24 horas.</li>
                <li>Preferencias personales (ej. “no me gustó”).</li>
              </ul>
              <h3 className={styles.sectionTitle}>6.4 Resolución</h3>
              <p className={styles.text}>
                Dingerbites analizará cada caso y podrá ofrecer reemplazo del producto, reembolso parcial o
                total, o nota de crédito. La resolución se realizará en un plazo razonable posterior a la
                revisión.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>7. Cancelaciones</h2>
              <p className={styles.text}>
                Las órdenes podrán cancelarse únicamente antes de ser enviadas. Una vez que el pedido ha
                sido despachado, no podrá ser cancelado.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>8. Protección de datos</h2>
              <p className={styles.text}>
                El tratamiento de datos personales se rige conforme a nuestra Política de Privacidad.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>9. Limitación de responsabilidad</h2>
              <p className={styles.text}>Dingerbites no será responsable por:</p>
              <ul className={styles.list}>
                <li>Retrasos de mensajería.</li>
                <li>Pérdidas atribuibles a terceros.</li>
                <li>Daños indirectos derivados del uso del sitio.</li>
              </ul>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>10. Modificaciones</h2>
              <p className={styles.text}>
                Dingerbites se reserva el derecho de modificar estos términos en cualquier momento.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>11. Legislación aplicable</h2>
              <p className={styles.text}>
                Estos términos se rigen conforme a las leyes aplicables en México.
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
