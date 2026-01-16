'use client';

import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './pos.module.css';

export default function Error({ reset }) {
  return (
    <AdminLayout title="Punto de venta">
      <div className={styles.emptyState}>
        <p>Ocurrió un error al cargar el punto de venta.</p>
        <button type="button" onClick={reset} className={styles.printButton}>
          Reintentar
        </button>
      </div>
    </AdminLayout>
  );
}
