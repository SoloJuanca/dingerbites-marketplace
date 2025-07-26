import Image from 'next/image';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import styles from './about.module.css';

export const metadata = {
  title: "Acerca de Nosotros - Patito Montenegro",
  description: "Conoce la historia de Patito Montenegro, líder en productos de belleza y cuidado de uñas con más de 8 años de experiencia.",
};

export default function AboutPage() {
  const reviews = [
    {
      id: 1,
      name: "María González",
      rating: 5,
      comment: "Excelente calidad en todos sus productos. Llevo años comprando aquí y siempre superan mis expectativas.",
      location: "Ciudad de México"
    },
    {
      id: 2,
      name: "Ana Rodríguez", 
      rating: 5,
      comment: "El servicio al cliente es excepcional. Mis uñas nunca se habían visto tan hermosas.",
      location: "Guadalajara"
    },
    {
      id: 3,
      name: "Carmen López",
      rating: 5,
      comment: "Productos de alta calidad y entrega súper rápida. Totalmente recomendado.",
      location: "Monterrey"
    }
  ];

  const teamMembers = [
    {
      id: 1,
      name: "Patricia Montenegro",
      role: "Fundadora & CEO",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b588?w=200&h=200&fit=crop&crop=face",
      description: "8 años de experiencia en la industria de la belleza"
    },
    {
      id: 2,
      name: "Elena Vargas",
      role: "Especialista en Productos",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
      description: "Experta en tendencias y calidad de productos"
    },
    {
      id: 3,
      name: "Sofia Hernández",
      role: "Atención al Cliente",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
      description: "Garantiza la mejor experiencia para nuestros clientes"
    }
  ];

  const galleryImages = [
    { id: 1, src: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center", alt: "Colección de esmaltes" },
    { id: 2, src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=300&fit=crop&crop=center", alt: "Herramientas de belleza" },
    { id: 3, src: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300&fit=crop&crop=center", alt: "Productos premium" }
  ];

  return (
    <>
      <Header />
      <main className={styles.aboutPage}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroContent}>
              <div className={styles.heroText}>
                <h1 className={styles.heroTitle}>
                  Nuestra <span className={styles.highlight}>Historia</span>
                </h1>
                <p className={styles.heroSubtitle}>
                  Más de 8 años creando belleza y confianza en cada cliente
                </p>
              </div>
              <div className={styles.heroImage}>
                <Image
                  src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500&h=400&fit=crop&crop=center"
                  alt="Tienda Patito Montenegro"
                  width={500}
                  height={400}
                  className={styles.storeImage}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Company Story */}
        <section className={styles.story}>
          <div className={styles.container}>
            <div className={styles.storyContent}>
              <div className={styles.storyText}>
                <h2 className={styles.sectionTitle}>¿Cómo comenzó todo?</h2>
                <p className={styles.storyParagraph}>
                  Patito Montenegro nació en 2016 de la pasión de nuestra fundadora por la belleza y el cuidado personal. 
                  Todo comenzó en un pequeño local donde ofrecíamos servicios de manicure y pedicure con productos 
                  importados de la más alta calidad.
                </p>
                <p className={styles.storyParagraph}>
                  La visión siempre fue clara: democratizar el acceso a productos de belleza premium, 
                  llevando la experiencia de un salón profesional directamente a casa de nuestros clientes.
                </p>
                <p className={styles.storyParagraph}>
                  A lo largo de estos 8 años, hemos crecido de ser un pequeño negocio local a una empresa 
                  reconocida nacionalmente, pero manteniendo siempre nuestro compromiso con la calidad 
                  y la satisfacción del cliente.
                </p>
              </div>
              <div className={styles.storyStats}>
                <div className={styles.stat}>
                  <Icon name="schedule" size={32} className={styles.statIcon} />
                  <span className={styles.statNumber}>8+</span>
                  <span className={styles.statLabel}>Años de experiencia</span>
                </div>
                <div className={styles.stat}>
                  <Icon name="people" size={32} className={styles.statIcon} />
                  <span className={styles.statNumber}>10,000+</span>
                  <span className={styles.statLabel}>Clientes satisfechos</span>
                </div>
                <div className={styles.stat}>
                  <Icon name="inventory" size={32} className={styles.statIcon} />
                  <span className={styles.statNumber}>500+</span>
                  <span className={styles.statLabel}>Productos disponibles</span>
                </div>
              </div>
            </div>
          </div>
        </section>

 {/* Gallery Section */}
 <section className={styles.gallery}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Nuestra Galería</h2>
            <div className={styles.galleryGrid}>
              {galleryImages.map((image) => (
                <div key={image.id} className={styles.galleryItem}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={400}
                    height={300}
                    className={styles.galleryImage}
                  />
                  <div className={styles.galleryOverlay}>
                    <Icon name="zoom_in" size={32} className={styles.galleryIcon} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Mission & Values */}
        <section className={styles.mission}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Nuestra Misión</h2>
            <div className={styles.missionGrid}>
              <div className={styles.missionCard}>
                <Icon name="favorite" size={48} className={styles.missionIcon} />
                <h3 className={styles.missionTitle}>Calidad Premium</h3>
                <p className={styles.missionText}>
                  Seleccionamos cuidadosamente cada producto para garantizar 
                  la máxima calidad y durabilidad.
                </p>
              </div>
              <div className={styles.missionCard}>
                <Icon name="local_shipping" size={48} className={styles.missionIcon} />
                <h3 className={styles.missionTitle}>Entrega Rápida</h3>
                <p className={styles.missionText}>
                  Llevamos tus productos favoritos directamente a tu puerta 
                  en tiempo récord.
                </p>
              </div>
              <div className={styles.missionCard}>
                <Icon name="support_agent" size={48} className={styles.missionIcon} />
                <h3 className={styles.missionTitle}>Atención Personalizada</h3>
                <p className={styles.missionText}>
                  Nuestro equipo está siempre disponible para brindarte 
                  la mejor experiencia de compra.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Reviews */}
        <section className={styles.reviews}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Lo que dicen nuestros clientes</h2>
            <div className={styles.reviewsGrid}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewStars}>
                      {[...Array(review.rating)].map((_, i) => (
                        <Icon key={i} name="star" size={16} className={styles.starIcon} filled />
                      ))}
                    </div>
                  </div>
                  <p className={styles.reviewText}>"{review.comment}"</p>
                  <div className={styles.reviewAuthor}>
                    <strong className={styles.authorName}>{review.name}</strong>
                    <span className={styles.authorLocation}>{review.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
} 