import Image from 'next/image';
import Link from 'next/link';
import Icon from '../Icon/Icon';
import styles from './MobileApp.module.css';

export default function MobileApp() {
  return (
    <section className={styles.mobileApp}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.imageContent}>
            <div className={styles.phoneWrapper}>
              <Image
                src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=500&fit=crop&crop=center"
                alt="Coleccionables y figuras"
                width={300}
                height={500}
                className={styles.phoneImage}
              />
            </div>
          </div>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              Novedades, mystery boxes y drops.
            </h2>
            <p className={styles.subtitle}>
              Lanzamientos de anime, nuevos gachapons y mystery boxes. Revisa el catalogo para ver lo mas reciente y no te pierdas los drops.
            </p>
            
            <div className={styles.highlights}>
              <div className={styles.highlight}>
                <Icon name="category" size={20} className={styles.highlightIcon} />
                <span>Anime, gachapons y videojuegos</span>
              </div>
              <div className={styles.highlight}>
                <Icon name="redeem" size={20} className={styles.highlightIcon} />
                <span>Mystery boxes y coleccionables</span>
              </div>
              <div className={styles.highlight}>
                <Icon name="local_shipping" size={20} className={styles.highlightIcon} />
                <span>Envios y recoleccion</span>
              </div>
            </div>
            
            <Link href="/catalog" className={styles.downloadBtn}>
              <Icon name="storefront" size={18} />
              Ver catalogo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
} 