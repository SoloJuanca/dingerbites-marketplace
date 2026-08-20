'use client';

import Link from 'next/link';
import Icon from '../Icon/Icon';
import { CATALOG_MODE_TCG } from '../../lib/catalogFilters';
import { buildGeneralCatalogUrl, buildTcgCatalogUrl } from '../../lib/catalogNavigation';
import { useSearchParams } from 'next/navigation';
import styles from './CatalogModeSwitcher.module.css';

export default function CatalogModeSwitcher({ mode = 'general' }) {
  const searchParams = useSearchParams();
  const isTcgMode = mode === CATALOG_MODE_TCG;

  if (isTcgMode) {
    return (
      <section className={styles.switcher} aria-label="Cambiar a catálogo general">
        <div className={styles.content}>
          <div className={styles.text}>
            <Icon name="storefront" size={24} className={styles.icon} aria-hidden />
            <div>
              <h2 className={styles.title}>¿Buscas otros productos?</h2>
              <p className={styles.description}>
                Explora figuras, gashapon, blind box y más fuera del catálogo TCG.
              </p>
            </div>
          </div>
          <Link href={buildGeneralCatalogUrl(searchParams)} className={styles.action}>
            Ir al resto de productos
            <Icon name="arrow_forward" size={20} aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.switcher} aria-label="Cambiar a búsqueda TCG">
      <div className={styles.content}>
        <div className={styles.text}>
          <Icon name="style" size={24} className={styles.icon} aria-hidden />
          <div>
            <h2 className={styles.title}>¿Buscas cartas TCG?</h2>
            <p className={styles.description}>
              Entra a la búsqueda especializada de cartón suelto, sets y catálogos TCG.
            </p>
          </div>
        </div>
        <Link href={buildTcgCatalogUrl(searchParams)} className={styles.action}>
          Ir a búsqueda de TCG
          <Icon name="arrow_forward" size={20} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
