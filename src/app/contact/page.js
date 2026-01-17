'use client';

import { useState } from 'react';
import Image from 'next/image';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import styles from './contact.module.css';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [activeAccordion, setActiveAccordion] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "¿Cuál es el tiempo de entrega de los productos?",
      answer: "Nuestros productos se entregan en un plazo de 2-5 días hábiles dentro de la ciudad y 5-7 días hábiles a nivel nacional. Para pedidos urgentes, ofrecemos entrega express en 24 horas."
    },
    {
      id: 2,
      question: "¿Qué métodos de pago aceptan?",
      answer: "Aceptamos tarjetas de crédito y débito (Visa, MasterCard, American Express), transferencias bancarias, OXXO Pay, PayPal y pagos en efectivo contra entrega."
    },
    {
      id: 3,
      question: "¿Ofrecen garantía en sus productos?",
      answer: "Sí, todos nuestros productos tienen garantía de calidad. Si no estás satisfecho con tu compra, puedes devolverla dentro de los primeros 30 días para un reembolso completo."
    },
    {
      id: 4,
      question: "¿Hacen envíos a toda la República Mexicana?",
      answer: "Sí, realizamos envíos a todo México. Los costos de envío varían según la ubicación y el peso del paquete. Envíos gratuitos en compras mayores a $800 pesos."
    },
    {
      id: 5,
      question: "¿Puedo visitar su tienda física?",
      answer: "¡Por supuesto! Puedes visitarnos en nuestra tienda ubicada en Colonia Roma Norte. Nuestro horario es de lunes a sábado de 10:00 AM a 8:00 PM y domingos de 12:00 PM a 6:00 PM."
    },
    {
      id: 6,
      question: "¿Ofrecen servicios de manicure y pedicure?",
      answer: "Sí, además de vender productos, ofrecemos servicios profesionales de manicure, pedicure y nail art en nuestra tienda física. Puedes agendar tu cita llamando o mediante WhatsApp."
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar el formulario
    alert('¡Gracias por contactarnos! Te responderemos pronto.');
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const toggleAccordion = (id) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

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
                  ¡Estamos aquí para <span className={styles.highlight}>ayudarte!</span>
                </h1>
                <p className={styles.heroSubtitle}>
                  ¿Tienes preguntas sobre nuestros productos o servicios? 
                  Contáctanos y resolveremos todas tus dudas.
                </p>
              </div>
              <div className={styles.heroImage}>
                <Image
                  src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=400&fit=crop&crop=center"
                  alt="Contacto Patito Montenegro"
                  width={500}
                  height={400}
                  className={styles.contactImage}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Contact Info */}
        <section className={styles.quickContact}>
          <div className={styles.container}>
            <div className={styles.contactGrid}>
              <div className={styles.contactCard}>
                <Icon name="phone" size={32} className={styles.contactIcon} />
                <h3 className={styles.contactTitle}>Teléfono</h3>
                <p className={styles.contactText}>+52 81 1613 2754</p>
                <p className={styles.contactSubtext}>Lun - Vie: 10:00 AM - 8:00 PM</p>
                <p className={styles.contactSubtext}>Sáb: 10:00 AM - 3:00 PM</p>
              </div>
              <div className={styles.contactCard}>
                <Icon name="email" size={32} className={styles.contactIcon} />
                <h3 className={styles.contactTitle}>Email</h3>
                <p className={styles.contactText}>hola@patitomontenegro.com</p>
                <p className={styles.contactSubtext}>Respuesta en 24 horas</p>
              </div>
              <div className={styles.contactCard}>
                <Icon name="location_on" size={32} className={styles.contactIcon} />
                <h3 className={styles.contactTitle}>Ubicación</h3>
                <p className={styles.contactText}>Lince 116, Col. Praderas de Guadalupe</p>
                <p className={styles.contactSubtext}>Guadalupe, Nuevo León</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className={styles.faq}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Preguntas Frecuentes</h2>
            <div className={styles.faqGrid}>
              <div className={styles.faqContent}>
                {faqs.map((faq) => (
                  <div key={faq.id} className={styles.faqItem}>
                    <button 
                      className={`${styles.faqQuestion} ${activeAccordion === faq.id ? styles.active : ''}`}
                      onClick={() => toggleAccordion(faq.id)}
                    >
                      <span>{faq.question}</span>
                      <Icon 
                        name={activeAccordion === faq.id ? "expand_less" : "expand_more"} 
                        size={24} 
                        className={styles.expandIcon} 
                      />
                    </button>
                    <div className={`${styles.faqAnswer} ${activeAccordion === faq.id ? styles.open : ''}`}>
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.faqImage}>
                <Image
                  src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=500&fit=crop&crop=center"
                  alt="Productos de belleza"
                  width={400}
                  height={500}
                  className={styles.faqImg}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className={styles.location}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Nuestra Ubicación</h2>
            <div className={styles.locationGrid}>
              <div className={styles.locationInfo}>
                <div className={styles.locationCard}>
                  <Icon name="store" size={48} className={styles.locationIcon} />
                  <h3 className={styles.locationTitle}>Tienda Principal</h3>
                  <p className={styles.locationAddress}>
                    Lince 116, Col. Praderas de Guadalupe<br/>
                    Guadalupe, Nuevo León<br/>
                    67203
                  </p>
                  <div className={styles.locationDetails}>
                    <div className={styles.locationDetail}>
                      <Icon name="schedule" size={20} className={styles.detailIcon} />
                      <div>
                        <strong>Horarios de Atención:</strong><br/>
                        Lun - Vie: 11:00 AM - 8:00 PM<br/>
                        Sáb: 10:00 AM - 3:00 PM<br/>
                        Dom: Cerrado
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
              <div className={styles.mapContainer}>
                <div className={styles.mapPlaceholder}>
                  <Icon name="map" size={64} className={styles.mapIcon} />
                  <h4>Mapa Interactivo</h4>
                  <p>Guadalupe, Nuevo León</p>
                  <button className={styles.mapButton}>
                    <Icon name="directions" size={20} />
                    Cómo llegar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className={styles.contactForm}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Envíanos un Mensaje</h2>
            <div className={styles.formGrid}>
              <div className={styles.formContent}>
                <h3 className={styles.formTitle}>¿Tienes alguna pregunta?</h3>
                <p className={styles.formDescription}>
                  Completa el formulario y nos pondremos en contacto contigo 
                  lo antes posible. También puedes escribirnos directamente 
                  por WhatsApp o llamarnos.
                </p>
                <div className={styles.socialContact}>
                  <a href="#" className={styles.socialButton}>
                    <Icon name="phone" size={20} />
                    WhatsApp
                  </a>
                  <a href="#" className={styles.socialButton}>
                    <Icon name="chat" size={20} />
                    Messenger
                  </a>
                </div>
              </div>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Nombre completo</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={styles.formInput}
                      required
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Teléfono</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Asunto</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={styles.formSelect}
                      required
                    >
                      <option value="">Selecciona un asunto</option>
                      <option value="productos">Consulta sobre productos</option>
                      <option value="servicios">Servicios de manicure</option>
                      <option value="envios">Información de envíos</option>
                      <option value="devoluciones">Devoluciones</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Mensaje</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    className={styles.formTextarea}
                    rows="5"
                    required
                  ></textarea>
                </div>
                <button type="submit" className={styles.formButton}>
                  <Icon name="send" size={20} />
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
} 