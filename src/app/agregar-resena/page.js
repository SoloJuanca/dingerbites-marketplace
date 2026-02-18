import { Suspense } from 'react';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import AgregarResenaClient from './AgregarResenaClient';
import styles from './agregar-resena.module.css';

function AgregarResenaFallback() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.loadingMsg}>Verificando enlace...</p>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AgregarResenaPage() {
  return (
    <Suspense fallback={<AgregarResenaFallback />}>
      <AgregarResenaClient />
    </Suspense>
  );
}
