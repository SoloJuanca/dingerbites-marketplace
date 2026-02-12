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
                src="https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300&h=500&fit=crop&crop=center"
                alt="Personas jugando un juego de mesa"
                width={300}
                height={500}
                className={styles.phoneImage}
              />
            </div>
          </div>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              Recomendaciones y novedades cada semana.
            </h2>
            <p className={styles.subtitle}>
              Publicamos lanzamientos, ranking de juegos y guias para que encuentres la mejor opcion
              segun tu grupo, tiempo de partida y estilo de juego.
            </p>
            
            <div className={styles.highlights}>
              <div className={styles.highlight}>
                <Icon name="casino" size={20} className={styles.highlightIcon} />
                <span>Juegos para todos los niveles</span>
              </div>
              <div className={styles.highlight}>
                <Icon name="groups" size={20} className={styles.highlightIcon} />
                <span>Opciones para 2 a 8+ jugadores</span>
              </div>
              <div className={styles.highlight}>
                <Icon name="schedule" size={20} className={styles.highlightIcon} />
                <span>Envios rapidos y seguros</span>
              </div>
            </div>
            
            <Link href="/catalog" className={styles.downloadBtn}>
              <Icon name="sports_esports" size={18} />
              Ver juegos destacados
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
} 