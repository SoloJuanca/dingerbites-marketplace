import ProductCard from '../ProductCard/ProductCard';
import styles from './BrowseMenu.module.css';

export default function BrowseMenu() {
  const products = [
    {
      id: 1,
      name: 'Esmalte Sueños de Rosa',
      description: 'Esmalte de uñas de larga duración con un acabado rosa soñador que complementa cualquier outfit',
      price: 12.99,
      image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 2,
      name: 'Laca Felicidad de Mora',
      description: 'Laca de uñas de tono mora rico con acabado de alto brillo y fórmula resistente a astillas',
      price: 14.50,
      image: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 3,
      name: 'Esmalte Beso Coral',
      description: 'Esmalte de uñas coral vibrante perfecto para días de verano y vibes de playa',
      price: 11.99,
      image: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 4,
      name: 'Elegancia Nude',
      description: 'Esmalte de uñas nude clásico para elegancia atemporal y looks profesionales',
      price: 13.99,
      image: 'https://images.unsplash.com/photo-1582747652673-603191058c91?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 5,
      name: 'Rosa Brillante',
      description: 'Esmalte de uñas rosa con brillantina que agrega glamour y brillo a cualquier ocasión',
      price: 15.99,
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 6,
      name: 'Cereza Pop',
      description: 'Esmalte de uñas rojo cereza audaz para hacer una declaración con confianza',
      price: 12.50,
      image: 'https://images.unsplash.com/photo-1515688594390-b649af70d282?w=400&h=300&fit=crop&crop=center'
    }
  ];

  return (
    <section className={styles.browseMenu}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Explora nuestra colección</h2>
          <p className={styles.subtitle}>
            Descubre nuestros productos de belleza premium y realiza un pedido en línea, o{' '}
            <a href="#phone" className={styles.phoneLink}>visita</a> nuestra tienda de belleza para 
            consultas personalizadas. Calidad premium, resultados hermosos.
          </p>
          <div className={styles.buttons}>
            <button className={styles.burgerBtn}>Esmaltes</button>
            <button className={styles.sidesBtn}>Cuidado de Piel</button>
            <button className={styles.drinksBtn}>Herramientas</button>
          </div>
        </div>
        <div className={styles.products}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className={styles.footer}>
          <button className={styles.seeFullBtn}>+ Ver Colección Completa</button>
        </div>
      </div>
    </section>
  );
} 