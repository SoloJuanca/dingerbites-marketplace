'use client';

import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from './payment-methods.module.css';

export default function Error({ reset }) {
  return (
    <AdminLayout title="Reporte de métodos de pago">
      <div className={styles.empty}>
        <p>Ocurrió un error al cargar el reporte.</p>
        <button type="button" onClick={reset} className={styles.buttonPrimary}>
          Reintentar
        </button>
      </div>
    </AdminLayout>
  );
}
