import Link from 'next/link';
import Icon from '../Icon/Icon';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoText}>
            <Icon name="palette" size={24} className={styles.logoIcon} />
            Patito Montenegro
          </Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Inicio</Link>
          <Link href="/catalog" className={styles.navLink}>Catálogo</Link>
          <Link href="/services" className={styles.navLink}>Servicios</Link>
          <Link href="/about" className={styles.navLink}>Nosotros</Link>
          <Link href="/contact" className={styles.navLink}>Contacto</Link>
        </nav>
        <div className={styles.actions}>
          <button className={styles.orderBtn}>Comprar Ahora</button>
        </div>
      </div>
    </header>
  );
} 