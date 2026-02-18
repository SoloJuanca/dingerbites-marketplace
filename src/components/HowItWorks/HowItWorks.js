import Icon from '../Icon/Icon';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  const steps = [
    {
      icon: 'explore',
      title: 'Explora por categoria',
      description: 'Filtra por anime, gachapons, mystery boxes, videojuegos y mas para encontrar las figuras y coleccionables que buscas.'
    },
    {
      icon: 'shopping_cart',
      title: 'Arma tu pedido',
      description: 'Agrega figuras, mystery boxes o videojuegos a tu carrito. Compra facil y con envio a todo Mexico o recoleccion.'
    },
    {
      icon: 'local_shipping',
      title: 'Recibe o recoge',
      description: 'Enviamos a domicilio o recoge en Mercado de la Y (sabados) o Galerias Valle Oriente. Todo empacado con cuidado.'
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