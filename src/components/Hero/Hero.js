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
              Tu tienda para descubrir <span className={styles.highlight}>juegos de mesa</span> increibles.
            </h1>
            <p className={styles.subtitle}>
              En Wildshot Games encuentras juegos familiares, estrategicos y party games para cada mesa. Compra facil, envios rapidos y asesoramiento para elegir el titulo ideal.
            </p>
            <Link href="/catalog" className={styles.orderBtn}>Ver Catalogo</Link>
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