import Icon from '../Icon/Icon';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  const steps = [
    {
      icon: 'explore',
      title: 'Explora por tipo de juego',
      description: 'Filtra por dificultad, duracion, numero de jugadores y tematica para encontrar rapido lo que mejor se adapta a tu mesa.'
    },
    {
      icon: 'shopping_cart',
      title: 'Arma tu carrito',
      description: 'Compara titulos, agrega expansiones y completa tu pedido en pocos pasos con una experiencia de compra simple.'
    },
    {
      icon: 'local_shipping',
      title: 'Recibe y juega',
      description: 'Empacamos con cuidado y enviamos a todo Mexico para que tus juegos lleguen listos para la siguiente partida.'
    }
  ];

  return (
    <section className={styles.howItWorks}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Como funciona</h2>
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