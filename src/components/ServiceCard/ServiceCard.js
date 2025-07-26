'use client';

import { useState } from 'react';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import ReservationModal from '../ReservationModal/ReservationModal';
import styles from './ServiceCard.module.css';

export default function ServiceCard({ service }) {
  const [showModal, setShowModal] = useState(false);

  const getAvailableSpots = () => {
    return service.schedule.reduce((total, schedule) => total + schedule.availableSpots, 0);
  };

  const getStatusColor = () => {
    const availableSpots = getAvailableSpots();
    if (availableSpots === 0) return styles.statusFull;
    if (availableSpots <= 5) return styles.statusLimited;
    return styles.statusAvailable;
  };

  const getStatusText = () => {
    const availableSpots = getAvailableSpots();
    if (availableSpots === 0) return 'Completo';
    if (availableSpots <= 5) return `${availableSpots} lugares`;
    return `${availableSpots} lugares`;
  };

  return (
    <>
      <div className={styles.card}>
        <div className={styles.imageWrapper}>
          <Image
            src={service.image}
            alt={service.name}
            width={350}
            height={200}
            className={styles.image}
          />
          <div className={`${styles.statusBadge} ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>
        
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.name}>{service.name}</h3>
            <span className={styles.category}>{service.category}</span>
          </div>
          
          <p className={styles.description}>{service.description}</p>
          
          <div className={styles.details}>
            <div className={styles.detailItem}>
              <Icon name="schedule" size={16} className={styles.detailIcon} />
              <span>{service.duration}</span>
            </div>
            <div className={styles.detailItem}>
              <Icon name="signal_cellular_alt" size={16} className={styles.detailIcon} />
              <span>{service.level}</span>
            </div>
          </div>
          
          <div className={styles.includes}>
            <h4 className={styles.includesTitle}>Incluye:</h4>
            <ul className={styles.includesList}>
              {service.includes.slice(0, 2).map((item, index) => (
                <li key={index} className={styles.includesItem}>
                  <Icon name="check_circle" size={14} className={styles.checkIcon} />
                  {item}
                </li>
              ))}
              {service.includes.length > 2 && (
                <li className={styles.includesMore}>
                  +{service.includes.length - 2} más
                </li>
              )}
            </ul>
          </div>
          
          <div className={styles.footer}>
            <div className={styles.price}>
              <span className={styles.priceAmount}>${service.price}</span>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className={styles.reserveBtn}
              disabled={getAvailableSpots() === 0}
            >
              {getAvailableSpots() === 0 ? 'Sin cupos' : 'Ver fechas'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <ReservationModal
          service={service}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
} 