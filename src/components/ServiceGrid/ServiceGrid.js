import { getServices } from '../../lib/services';
import ServiceCard from '../ServiceCard/ServiceCard';
import Icon from '../Icon/Icon';
import styles from './ServiceGrid.module.css';

export default function ServiceGrid({
  category,
  level,
  minPrice,
  maxPrice
}) {
  const filters = {
    category,
    level,
    minPrice,
    maxPrice
  };

  const services = getServices(filters);

  if (services.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Icon name="school" size={64} className={styles.schoolIcon} />
        </div>
        <h3 className={styles.emptyTitle}>No se encontraron servicios</h3>
        <p className={styles.emptyMessage}>
          Intenta ajustar los filtros para ver más cursos disponibles
        </p>
      </div>
    );
  }

  return (
    <div className={styles.gridContainer}>
      <div className={styles.resultsHeader}>
        <p className={styles.resultsCount}>
          {services.length} {services.length === 1 ? 'servicio' : 'servicios'} disponibles
        </p>
      </div>

      <div className={styles.serviceGrid}>
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
} 