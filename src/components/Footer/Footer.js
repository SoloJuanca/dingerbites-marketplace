import Link from 'next/link';
import Icon from '../Icon/Icon';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.topSection}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.leftSection}>
              <div className={styles.foodSection}>
                <h3 className={styles.sectionTitle}>
                  <Icon name="palette" size={32} className={styles.sectionIcon} />
                  ¡Explora, elige y has brillar tu creatividad!
                </h3>
              </div>
            </div>
            <div className={styles.rightSection}>
                <Link href="/catalog" className={styles.catalogButton}>
                <div className={styles.promoText}>
                  <span className={styles.highlight}>Busca tus productos favoritos</span>
                </div>
                </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.bottomSection}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.logo}>
              <span className={styles.logoText}>
                <Icon name="palette" size={24} className={styles.logoIcon} />
                Patito Montenegro
              </span>
            </div>
            <div className={styles.links}>
              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Empresa</h4>
                <a href="#about" className={styles.link}>Sobre Nosotros</a>
                <a href="#contact" className={styles.link}>Contacto</a>
              </div>
              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Productos</h4>
                <a href="/catalog" className={styles.link}>Marca 1</a>
                <a href="/catalog" className={styles.link}>Marca 2</a>
                <a href="/catalog" className={styles.link}>Marca 3</a>
              </div>
              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Servicios</h4>
                <a href="/services" className={styles.link}>Cursos</a>
                <a href="/services" className={styles.link}>Talleres</a>
              </div>
            </div>
          </div>
          <div className={styles.copyright}>
            <p>Hecho por Moriet</p>
          </div>
        </div>
      </div>
    </footer>
  );
} 