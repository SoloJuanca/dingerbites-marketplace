'use client';

import { useState } from 'react';
import { reserveSpot } from '../../lib/services';
import Icon from '../Icon/Icon';
import styles from './ReservationModal.module.css';

export default function ReservationModal({ service, onClose }) {
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [reservationData, setReservationData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationConfirmed, setReservationConfirmed] = useState(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <Icon name="check_circle" size={16} className={styles.availableIcon} />;
      case 'limited':
        return <Icon name="warning" size={16} className={styles.limitedIcon} />;
      case 'full':
        return <Icon name="cancel" size={16} className={styles.fullIcon} />;
      default:
        return null;
    }
  };

  const getStatusText = (schedule) => {
    if (schedule.status === 'full') return 'Completo';
    if (schedule.status === 'limited') return `Solo ${schedule.availableSpots} lugares`;
    return `${schedule.availableSpots} lugares disponibles`;
  };

  const handleScheduleSelect = (schedule) => {
    if (schedule.status === 'full') return;
    setSelectedSchedule(schedule);
    setShowBookingForm(true);
  };

  const handleInputChange = (e) => {
    setReservationData({
      ...reservationData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitReservation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = reserveSpot(service.id, selectedSchedule.id, reservationData);
      
      if (result.success) {
        setReservationConfirmed(result);
        setShowBookingForm(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Error al procesar la reserva. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedSchedule(null);
    setShowBookingForm(false);
    setReservationConfirmed(null);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{service.name}</h2>
          <button onClick={handleClose} className={styles.closeBtn}>
            <Icon name="close" size={24} />
          </button>
        </div>

        {reservationConfirmed ? (
          <div className={styles.confirmationSection}>
            <div className={styles.successIcon}>
              <Icon name="check_circle" size={48} className={styles.confirmIcon} />
            </div>
            <h3 className={styles.confirmTitle}>¡Reserva Confirmada!</h3>
            <p className={styles.confirmMessage}>
              Tu lugar ha sido reservado exitosamente.
            </p>
            <div className={styles.confirmDetails}>
              <p><strong>Número de confirmación:</strong> {reservationConfirmed.confirmationNumber}</p>
              <p><strong>Fecha:</strong> {formatDate(selectedSchedule.date)}</p>
              <p><strong>Horario:</strong> {selectedSchedule.time}</p>
              <p><strong>Nombre:</strong> {reservationConfirmed.reservationData.name}</p>
            </div>
            <button onClick={handleClose} className={styles.closeConfirmBtn}>
              Cerrar
            </button>
          </div>
        ) : showBookingForm ? (
          <div className={styles.bookingSection}>
            <div className={styles.selectedSchedule}>
              <h3 className={styles.scheduleTitle}>Fecha seleccionada:</h3>
              <div className={styles.scheduleItem}>
                <div className={styles.scheduleDate}>
                  {formatDate(selectedSchedule.date)}
                </div>
                <div className={styles.scheduleTime}>{selectedSchedule.time}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitReservation} className={styles.bookingForm}>
              <h3 className={styles.formTitle}>Datos para la reserva</h3>
              
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.formLabel}>Nombre completo</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={reservationData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.formInput}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={reservationData.email}
                  onChange={handleInputChange}
                  required
                  className={styles.formInput}
                  placeholder="tu@email.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.formLabel}>Teléfono</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={reservationData.phone}
                  onChange={handleInputChange}
                  required
                  className={styles.formInput}
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  onClick={() => setShowBookingForm(false)}
                  className={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={styles.submitBtn}
                >
                  {isSubmitting ? 'Procesando...' : `Reservar por $${service.price}`}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className={styles.scheduleSection}>
            <div className={styles.serviceInfo}>
              <p className={styles.serviceDescription}>{service.description}</p>
              <div className={styles.serviceDetails}>
                <div className={styles.detailItem}>
                  <Icon name="schedule" size={16} className={styles.detailIcon} />
                  <span>Duración: {service.duration}</span>
                </div>
                <div className={styles.detailItem}>
                  <Icon name="signal_cellular_alt" size={16} className={styles.detailIcon} />
                  <span>Nivel: {service.level}</span>
                </div>
                <div className={styles.detailItem}>
                  <Icon name="attach_money" size={16} className={styles.detailIcon} />
                  <span>Precio: ${service.price}</span>
                </div>
              </div>
            </div>

            <div className={styles.includesSection}>
              <h3 className={styles.includesTitle}>¿Qué incluye?</h3>
              <ul className={styles.includesList}>
                {service.includes.map((item, index) => (
                  <li key={index} className={styles.includesItem}>
                    <Icon name="check_circle" size={14} className={styles.checkIcon} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.scheduleList}>
              <h3 className={styles.scheduleListTitle}>Fechas disponibles:</h3>
              {service.schedule.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`${styles.scheduleItem} ${
                    schedule.status === 'full' ? styles.scheduleDisabled : styles.scheduleEnabled
                  }`}
                  onClick={() => handleScheduleSelect(schedule)}
                >
                  <div className={styles.scheduleInfo}>
                    <div className={styles.scheduleDate}>
                      {formatDate(schedule.date)}
                    </div>
                    <div className={styles.scheduleTime}>{schedule.time}</div>
                  </div>
                  <div className={styles.scheduleStatus}>
                    {getStatusIcon(schedule.status)}
                    <span>{getStatusText(schedule)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 