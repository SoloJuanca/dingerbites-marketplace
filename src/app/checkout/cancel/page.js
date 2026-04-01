import Link from 'next/link';
import styles from './cancel.module.css';

export default function CheckoutCancelPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Pago cancelado</h1>
        <p className={styles.text}>
          No se realizó ningún cargo. Puedes volver al checkout o al carrito cuando quieras.
        </p>
        <div className={styles.actions}>
          <Link href="/checkout" className={styles.primary}>
            Volver al checkout
          </Link>
          <Link href="/cart" className={styles.secondary}>
            Ir al carrito
          </Link>
        </div>
      </div>
    </div>
  );
}
