import Image from 'next/image';
import Link from 'next/link';
import Icon from '../Icon/Icon';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h1 className={styles.title}>
              Uñas hermosas y productos de belleza, <span className={styles.highlight}>entregados</span> a tu puerta.
            </h1>
            <p className={styles.subtitle}>
              Descubre nuestra colección premium de esmaltes de uñas, herramientas de belleza y productos para el cuidado de la piel. 
              Todo lo que necesitas para la manicura perfecta y rutina de belleza, entregado fresco a ti.
            </p>
            <Link href="/catalog" className={styles.orderBtn}>Ver Colección</Link>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>4.9</span>
                <span className={styles.statText}>
                  <Icon name="star" size={16} className={styles.starIcon} filled />
                  500+ clientes felices
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 