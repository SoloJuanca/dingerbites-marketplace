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
              Todo lo que necesidas para crear, <span className={styles.highlight}>uñas</span> hermosas.
            </h1>
            <p className={styles.subtitle}>
              ¡Bienvenida a tu tienda favorita de uñas, Patito Montenegro! Encuentra todo lo que necesitas para crear uñas hermosas, material profesional y ¡lo más nuevo en el mundo de las uñas!
            </p>
            <Link href="/catalog" className={styles.orderBtn}>Ver Colección</Link>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statText}>
                  <Icon name="star" size={16} className={styles.starIcon} filled />
                  Envíos a todo el México
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 