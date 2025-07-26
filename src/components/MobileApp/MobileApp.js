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
                src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=500&fit=crop&crop=center"
                alt="Taller de uñas profesional"
                width={300}
                height={500}
                className={styles.phoneImage}
              />
            </div>
          </div>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              Aprende con nuestros talleres profesionales de uñas.
            </h2>
            <p className={styles.subtitle}>
              Descubre nuestros cursos y talleres especializados en técnicas de uñas, nail art y tratamientos de belleza. 
              Impartidos por profesionales certificados con cupos limitados. ¡Mantente atenta a nuestras próximas fechas!
            </p>
            
            <div className={styles.highlights}>
              <div className={styles.highlight}>
                <Icon name="school" size={20} className={styles.highlightIcon} />
                <span>Instructores certificados</span>
              </div>
              <div className={styles.highlight}>
                <Icon name="groups" size={20} className={styles.highlightIcon} />
                <span>Grupos pequeños</span>
              </div>
              <div className={styles.highlight}>
                <Icon name="schedule" size={20} className={styles.highlightIcon} />
                <span>Horarios flexibles</span>
              </div>
            </div>
            
            <Link href="/services" className={styles.downloadBtn}>
              <Icon name="calendar_month" size={18} />
              Ver Talleres Disponibles
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
} 