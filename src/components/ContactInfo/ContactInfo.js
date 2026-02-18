'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '../Icon/Icon';
import styles from './ContactInfo.module.css';

const WHATSAPP_NUMBER = '528116132754';

export default function ContactInfo() {
  const [whatLookingFor, setWhatLookingFor] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = whatLookingFor.trim()
      ? `Hola, estoy buscando: ${whatLookingFor.trim()}`
      : 'Hola, me gustaría saber si pueden conseguir algo que busco.';
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setWhatLookingFor('');
  };

  return (
    <section className={styles.contactInfo}>
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>
            ¿No encuentras lo que buscabas?
          </h2>
          <p className={styles.subtitle}>
            ¡Haznos saber qué buscas para poder conseguirlo!
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="whatLookingFor" className={styles.label}>
                ¿Qué estás buscando?
              </label>
              <input
                type="text"
                id="whatLookingFor"
                value={whatLookingFor}
                onChange={(e) => setWhatLookingFor(e.target.value)}
                className={styles.input}
                placeholder="Ej: un juego de estrategia para 4 jugadores..."
                autoComplete="off"
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              <Icon name="chat" size={20} />
              Contáctanos por WhatsApp
            </button>
          </form>

          <p className={styles.hint}>
            Escríbenos por WhatsApp y te ayudamos a conseguirlo.
          </p>
        </div>
      </div>
    </section>
  );
}
