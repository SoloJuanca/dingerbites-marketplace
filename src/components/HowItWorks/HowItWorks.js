import Icon from '../Icon/Icon';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  const steps = [
    {
      icon: 'palette',
      title: 'Explora y dejate inspirar',
      description: 'Explora y dejate inspirar por nuestra selección de materiales profesionales para uñas. Navega y sorprendete con todo lo nuevo que traemos para ti.'
    },
    {
      icon: 'shopping_cart',
      title: 'Agrega tus favoritos',
      description: '¡Agrega tus favoritos al carrito y empieza a disfrutar de la mejor calidad!'
    },
    {
      icon: 'local_shipping',
      title: 'Envíos seguros y puntuales',
      description: 'Reciba sus productos con embalaje profesional y atención dedicada. Comprometidos con la calidad hasta tu puerta.'
    }
  ];

  return (
    <section className={styles.howItWorks}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Cómo funciona.</h2>
        </div>
        <div className={styles.steps}>
          {steps.map((step, index) => (
            <div key={index} className={styles.step}>
              <div className={styles.stepIcon}>
                <Icon name={step.icon} size={32} className={styles.icon} />
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 