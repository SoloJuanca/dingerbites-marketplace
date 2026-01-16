import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './pos.module.css';

export default function Loading() {
  return (
    <AdminLayout title="Punto de venta">
      <div className={styles.loading}>Cargando punto de venta...</div>
    </AdminLayout>
  );
}
