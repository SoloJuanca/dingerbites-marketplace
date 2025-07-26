import Icon from '../Icon/Icon';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  const steps = [
    {
      icon: 'palette',
      title: 'Explora nuestra colección de belleza',
      description: 'Explora nuestra selección curada de esmaltes de uñas premium, herramientas de belleza y esenciales para el cuidado de la piel.'
    },
    {
      icon: 'shopping_cart',
      title: 'Agrega al carrito y personaliza',
      description: 'Selecciona tus tonos favoritos y productos de belleza. Mezcla y combina para crear tu colección perfecta.'
    },
    {
      icon: 'local_shipping',
      title: 'Entrega rápida y segura',
      description: 'Disfruta de envío rápido con empaques hermosos. Tus esenciales de belleza entregados directo a tu puerta.'
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