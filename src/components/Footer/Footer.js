import Image from 'next/image';
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
                  <Icon name="sports_esports" size={32} className={styles.sectionIcon} />
                  Descubre tu proximo juego favorito.
                </h3>
              </div>
            </div>
            <div className={styles.rightSection}>
                <Link href="/catalog" className={styles.catalogButton}>
                <div className={styles.promoText}>
                  <span className={styles.highlight}>Explora el catalogo de juegos de mesa</span>
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
              <Image
                src="/logo-wildshot.png"
                alt="Wildshot Games"
                width={64}
                height={64}
                className={styles.footerLogoImage}
              />
            </div>
            <div className={styles.links}>
              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Empresa</h4>
                <Link href="/about">
                <span className={styles.link}>
                  Sobre Nosotros
                  </span>
                </Link>
                <Link href="/contact">
                <span className={styles.link}>
                  Contacto
                  </span>
                </Link>
              </div>
              <div className={styles.linkGroup}>
                <h4 className={styles.linkTitle}>Legal</h4>
                <Link href="/terminos">
                <span className={styles.link}>
                  Términos y Condiciones
                  </span>
                </Link>
                <Link href="/privacidad">
                <span className={styles.link}>
                  Aviso de Privacidad
                  </span>
                </Link>
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