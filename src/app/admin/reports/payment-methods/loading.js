import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from './payment-methods.module.css';

export default function Loading() {
  return (
    <AdminLayout title="Reporte de métodos de pago">
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Cargando reporte…</p>
      </div>
    </AdminLayout>
  );
}
