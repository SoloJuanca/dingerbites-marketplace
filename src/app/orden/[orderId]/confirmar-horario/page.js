'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Header from '../../../../components/Header/Header';
import Footer from '../../../../components/Footer/Footer';
import { useAuth } from '../../../../lib/AuthContext';
import styles from './confirmar-horario.module.css';

function ConfirmarHorarioContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { apiRequest } = useAuth();
  const orderId = params.orderId;
  const token = searchParams.get('token');

  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = token
          ? `/api/orders/${orderId}/schedule-response?token=${encodeURIComponent(token)}`
          : `/api/orders/${orderId}/schedule-response`;
        const response = token ? fetch(url) : (apiRequest ? apiRequest(url) : fetch(url));
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || 'No se pudo cargar el horario');
          setSchedule(null);
          return;
        }
        const data = await response.json();
        setSchedule(data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar');
        setSchedule(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [orderId, token]);

  const handleResponse = async (status) => {
    if (!orderId) return;
    try {
      setSubmitting(true);
      const body = token ? { delivery_schedule_status: status, token } : { delivery_schedule_status: status };
      const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      const response = token
        ? await fetch(`/api/orders/${orderId}/schedule-response`, opts)
        : (apiRequest ? await apiRequest(`/api/orders/${orderId}/schedule-response`, opts) : await fetch(`/api/orders/${orderId}/schedule-response`, opts));

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Error al guardar');
        return;
      }
      toast.success(status === 'accepted' ? 'Horario aceptado' : 'Horario rechazado');
      setSchedule(prev => prev ? { ...prev, delivery_schedule_status: status } : null);
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.spinner} />
            <p>Cargando horario...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !schedule) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.card}>
            <h1>No se pudo cargar</h1>
            <p>{error || 'Orden no encontrada o enlace inválido.'}</p>
            <Link href="/" className={styles.homeLink}>Ir al inicio</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const alreadyResponded = schedule.delivery_schedule_status === 'accepted' || schedule.delivery_schedule_status === 'rejected';

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Confirmar horario de entrega</h1>
          <p className={styles.orderRef}>Pedido {schedule.order_number}</p>

          {alreadyResponded ? (
            <div className={styles.alreadyResponded}>
              <p>Ya respondiste a este horario: <strong>{schedule.delivery_schedule_status === 'accepted' ? 'Aceptado' : 'Rechazado'}</strong></p>
              <p>Si necesitas cambiar tu respuesta, contáctanos.</p>
            </div>
          ) : (
            <>
              <div className={styles.scheduleInfo}>
                <p><strong>Fecha propuesta:</strong> {formatDate(schedule.scheduled_delivery_date)}</p>
                {schedule.scheduled_delivery_time && (
                  <p><strong>Horario:</strong> {schedule.scheduled_delivery_time}</p>
                )}
              </div>

              <p className={styles.instructions}>¿Te funciona este horario?</p>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.acceptButton}
                  onClick={() => handleResponse('accepted')}
                  disabled={submitting}
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  className={styles.rejectButton}
                  onClick={() => handleResponse('rejected')}
                  disabled={submitting}
                >
                  Rechazar
                </button>
              </div>
            </>
          )}

          <Link href="/" className={styles.homeLink}>Volver al inicio</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function ConfirmarHorarioPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.card}>Cargando...</div>
      </div>
    }>
      <ConfirmarHorarioContent />
    </Suspense>
  );
}
