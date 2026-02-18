import Image from 'next/image';
import Link from 'next/link';
import styles from './FreshProducts.module.css';

export default function FreshProducts() {
  return (
    <section className={styles.freshProducts}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.imageContent}>
            <div className={styles.productImage}>
              <Image
                src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&h=400&fit=crop&crop=center"
                alt="Figuras de anime y coleccionables"
                width={500}
                height={400}
                className={styles.image}
              />
            </div>
          </div>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              Anime, <span className={styles.highlight}>mystery boxes</span> y coleccionables
            </h2>
            <p className={styles.subtitle}>
              Figuras, gachapons, mystery boxes, videojuegos y merchandising de tus series y juegos favoritos. Siempre llegando novedades.
            </p>
            <Link href="/catalog" className={styles.learnBtn}>Ver todo</Link>
          </div>
        </div>
      </div>
    </section>
  );
} 