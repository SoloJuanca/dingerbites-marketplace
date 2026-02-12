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
                src="https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=500&h=400&fit=crop&crop=center"
                alt="Mesa con juegos de mesa modernos"
                width={500}
                height={400}
                className={styles.image}
              />
            </div>
          </div>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              Seleccion curada de <span className={styles.highlight}>juegos de mesa</span> para todos los niveles
            </h2>
            <p className={styles.subtitle}>
              Desde juegos familiares hasta euros exigentes: te ayudamos a encontrar experiencias memorables para reuniones, torneos y noches de juego en casa.
            </p>
            <Link href="/about" className={styles.learnBtn}>Conoce más</Link>
          </div>
        </div>
      </div>
    </section>
  );
} 