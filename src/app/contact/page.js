'use client';

import Image from 'next/image';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import styles from './contact.module.css';

const WHATSAPP_NUMBER = '528116132754';

export default function ContactPage() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <>
      <Header />
      <main className={styles.contactPage}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroContent}>
              <div className={styles.heroText}>
                <h1 className={styles.heroTitle}>
                  ¿No encuentras lo que buscabas?
                </h1>
                <p className={styles.heroSubtitle}>
                  Escríbenos por WhatsApp y con gusto te ayudamos a conseguirlo.
                </p>
                <a
                  href={`${whatsappUrl}?text=${encodeURIComponent('Hola, me gustaría contactarlos.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whatsappBtn}
                >
                  <Icon name="chat" size={24} />
                  Contactar por WhatsApp
                </a>
              </div>
              <div className={styles.heroImage}>
                <Image
                  src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=400&fit=crop&crop=center"
                  alt="Contacto"
                  width={500}
                  height={400}
                  className={styles.contactImage}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Opciones de recolección */}
        <section className={styles.pickupSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Opciones de recolección</h2>
            <p className={styles.sectionIntro}>
              Puedes recoger tu pedido en los siguientes puntos:
            </p>
            <div className={styles.pickupGrid}>
              <div className={styles.pickupCard}>
                <Icon name="location_on" size={40} className={styles.pickupIcon} />
                <h3 className={styles.pickupTitle}>Mercado de la Y</h3>
                <p className={styles.pickupDetail}>Los sábados</p>
              </div>
              <div className={styles.pickupCard}>
                <Icon name="store" size={40} className={styles.pickupIcon} />
                <h3 className={styles.pickupTitle}>Galerías Valle Oriente</h3>
                <p className={styles.pickupDetail}>Punto de recolección</p>
              </div>
            </div>
            <p className={styles.pickupHint}>
              Coordina tu recolección por WhatsApp.
            </p>
          </div>
        </section>

        {/* WhatsApp CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <p className={styles.ctaText}>
              ¿Dudas o quieres pedir algo en específico?
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappBtnLarge}
            >
              <Icon name="chat" size={28} />
              Escribir por WhatsApp
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
