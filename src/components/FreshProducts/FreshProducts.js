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
                src="https://images.unsplash.com/photo-1515688594390-b649af70d282?w=500&h=400&fit=crop&crop=center"
                alt="Productos premium de belleza"
                width={500}
                height={400}
                className={styles.image}
              />
            </div>
          </div>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              Tu tienda en línea de <span className={styles.highlight}>material para uñas</span> donde la calidad y confianza son nuestra prioridad
            </h2>
            <p className={styles.subtitle}>
              Descubre una amplia variedad de productos profesionales diseñados para que las uñas luzcan perfectas. ¡Únete a nuestra comunidad de clientes satisfechos y dale a tus uñas el cuidado que se merecen.
            </p>
            <Link href="/about" className={styles.learnBtn}>Conoce más</Link>
          </div>
        </div>
      </div>
    </section>
  );
} 