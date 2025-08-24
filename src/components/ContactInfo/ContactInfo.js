import Icon from '../Icon/Icon';
import styles from './ContactInfo.module.css';

export default function ContactInfo() {
  const businessInfo = {
    name: "Bella Belleza - Salón de Belleza",
    address: "Lince 116 col. Praderas de Guadalupe  ",
    city: "Guadalupe, Nuevo Leon 67203",
    phone: "+52 81 16 13 27 54",
    //email: "info@bellabelleza.com",
    hours: {
      weekdays: "Lunes a Viernes: 11:00 AM - 8:00 PM",
      saturday: "Sábado: 10:00 AM - 3:00 PM",
      //sunday: "Domingo: 10:00 AM - 4:00 PM"
    }
  };

  return (
    <section className={styles.contactInfo}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              ¡Visitanos en persona!
            </h2>
            <p className={styles.subtitle}>
              Descubre todos nuestros productos en nuestra tienda fisica y recibe atención personalizada.
            </p>
            
            <div className={styles.contactDetails}>
              <div className={styles.contactItem}>
                <Icon name="location_on" size={20} className={styles.contactIcon} />
                <div className={styles.contactText}>
                  <strong>{businessInfo.address}</strong>
                  <br />
                  {businessInfo.city}
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <Icon name="phone" size={20} className={styles.contactIcon} />
                <div className={styles.contactText}>
                  <strong>{businessInfo.phone}</strong>
                </div>
              </div>
              
              <div className={styles.contactItem}>
                <Icon name="schedule" size={20} className={styles.contactIcon} />
                <div className={styles.contactText}>
                  <div>{businessInfo.hours.weekdays}</div>
                  <div>{businessInfo.hours.saturday}</div>
                  <div>{businessInfo.hours.sunday}</div>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <a 
                href={`tel:${businessInfo.phone}`} 
                className={styles.contactBtn}
              >
                <Icon name="phone" size={18} />
                Llamar ahora
              </a>
              {businessInfo?.email && (
                <a 
                  href={`mailto:${businessInfo.email}`} 
                  className={styles.emailBtn}
                >
                  <Icon name="email" size={18} />
                  Enviar email
                </a>
              )}
            </div>
          </div>
          
          <div className={styles.mapContent}>
            <div className={styles.mapContainer}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3596.3377406980057!2d-100.1612202!3d25.6600966!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8662c22320455803%3A0xc791bf58f0e37400!2sPatito%20Montenegro!5e0!3m2!1ses!2smx!4v1755993608690!5m2!1ses!2smx"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className={styles.map}
                title="Ubicación de Bella Belleza"
              ></iframe>
            </div>
            <div className={styles.mapFooter}>
              <a 
                href="https://maps.app.goo.gl/ENHRsNHdRTWyAWRw7"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.directionsBtn}
              >
                <Icon name="directions" size={18} />
                Ver en Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 