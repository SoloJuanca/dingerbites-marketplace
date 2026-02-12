import Image from 'next/image';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import styles from './about.module.css';

export const metadata = {
  title: "Sobre Nosotros - Wildshot",
  description: "Conoce Wildshot: tu tienda de juegos de mesa. Pasión por los juegos de mesa, estrategia y momentos en familia o con amigos.",
};

export default function AboutPage() {
  const reviews = [
    {
      id: 1,
      name: "Carlos Méndez",
      rating: 5,
      comment: "La mejor tienda de juegos de mesa. Asesoramiento increíble y envíos rápidos. Ya tenemos una colección que envidia todo el grupo.",
      location: "Ciudad de México"
    },
    {
      id: 2,
      name: "Laura Sánchez",
      rating: 5,
      comment: "Encontré juegos que no veo en ningún otro lado. Las partidas en familia ahora son lo mejor de la semana.",
      location: "Guadalajara"
    },
    {
      id: 3,
      name: "Roberto Díaz",
      rating: 5,
      comment: "Calidad y variedad de juegos de mesa excelente. El equipo conoce cada caja y te recomienda según lo que buscas.",
      location: "Monterrey"
    }
  ];

  const galleryImages = [
    { id: 1, src: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop&crop=center", alt: "Juegos de mesa y cartas" },
    { id: 2, src: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=400&h=300&fit=crop&crop=center", alt: "Partida de juegos de mesa" },
    { id: 3, src: "https://images.unsplash.com/photo-1585504198199-20277593b94f?w=400&h=300&fit=crop&crop=center", alt: "Dados y tableros" }
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
                  Tu tienda de juegos de mesa: estrategia, diversión y momentos inolvidables en familia o con amigos
                </p>
              </div>
              <div className={styles.heroImage}>
                <Image
                  src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=500&h=400&fit=crop&crop=center"
                  alt="Juegos de mesa Wildshot"
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
                  Wildshot nació de la pasión por los juegos de mesa: clásicos, estrategia, cooperativos y de party. 
                  Todo empezó como un hobby entre amigos que compartían partidas cada fin de semana y querían 
                  descubrir más títulos y llevarlos a más gente.
                </p>
                <p className={styles.storyParagraph}>
                  Nuestra idea siempre fue clara: ser la tienda donde encuentres desde los juegos más conocidos 
                  hasta joyas difíciles de conseguir, con asesoramiento real de quien juega y no solo vende.
                </p>
                <p className={styles.storyParagraph}>
                  Hoy seguimos creciendo como comunidad: organizamos partidas, recomendamos según tu grupo y 
                  te ayudamos a elegir el siguiente juego que se va a quedar en tu mesa.
                </p>
              </div>
              <div className={styles.storyStats}>
                <div className={styles.stat}>
                  <Icon name="schedule" size={32} className={styles.statIcon} />
                  <span className={styles.statNumber}>+500</span>
                  <span className={styles.statLabel}>Juegos en catálogo</span>
                </div>
                <div className={styles.stat}>
                  <Icon name="people" size={32} className={styles.statIcon} />
                  <span className={styles.statNumber}>+5.000</span>
                  <span className={styles.statLabel}>Jugadores satisfechos</span>
                </div>
                <div className={styles.stat}>
                  <Icon name="inventory" size={32} className={styles.statIcon} />
                  <span className={styles.statNumber}>100%</span>
                  <span className={styles.statLabel}>Pasión por el juego</span>
                </div>
              </div>
            </div>
          </div>
        </section>

 {/* Gallery Section */}
 <section className={styles.gallery}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Nuestra galería</h2>
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
            <h2 className={styles.sectionTitle}>Nuestra misión</h2>
            <div className={styles.missionGrid}>
              <div className={styles.missionCard}>
                <Icon name="favorite" size={48} className={styles.missionIcon} />
                <h3 className={styles.missionTitle}>Juegos bien elegidos</h3>
                <p className={styles.missionText}>
                  Seleccionamos y probamos juegos de mesa para ofrecer 
                  títulos que de verdad se juegan y se disfrutan.
                </p>
              </div>
              <div className={styles.missionCard}>
                <Icon name="local_shipping" size={48} className={styles.missionIcon} />
                <h3 className={styles.missionTitle}>Entrega a tu mesa</h3>
                <p className={styles.missionText}>
                  Llevamos tu próximo juego favorito hasta tu puerta 
                  para que no falte nada en la próxima partida.
                </p>
              </div>
              <div className={styles.missionCard}>
                <Icon name="support_agent" size={48} className={styles.missionIcon} />
                <h3 className={styles.missionTitle}>Asesoramiento de jugadores</h3>
                <p className={styles.missionText}>
                  Te ayudamos a elegir según jugadores, tiempo y estilo: 
                  estrategia, party, cooperativo o familiar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Reviews */}
        <section className={styles.reviews}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Lo que dicen los jugadores</h2>
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
                  <p className={styles.reviewText}>{'"' + review.comment + '"'}</p>
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