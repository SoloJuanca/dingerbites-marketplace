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
              Anime, <span className={styles.highlight}>gachapons</span>, mystery boxes y videojuegos.
            </h1>
            <p className={styles.subtitle}>
              Encuentra figuras de anime, gachapons, mystery boxes, videojuegos y más. Envios a todo Mexico y opcion de recoleccion.
            </p>
            <Link href="/catalog" className={styles.orderBtn}>Ver catalogo</Link>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statText}>
                  <Icon name="star" size={16} className={styles.starIcon} filled />
                  Envio a todo Mexico
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 