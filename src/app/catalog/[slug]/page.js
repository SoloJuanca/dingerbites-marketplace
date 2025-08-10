import { Suspense } from 'react';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import ImageCarousel from '../../../components/ImageCarousel/ImageCarousel';
import ProductInfo from '../../../components/ProductInfo/ProductInfo';
import ProductReviews from '../../../components/ProductReviews/ProductReviews';
import ProductSummary from '../../../components/ProductSummary/ProductSummary';
import { getProductBySlug } from '../../../lib/products';
import styles from './product.module.css';

// Server Component para obtener datos del producto
async function ProductData({ slug }) {
  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.notFound}>
              <h1>Producto no encontrado</h1>
              <p>El producto que buscas no existe o ha sido eliminado.</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.productLayout}>
            {/* Columna izquierda - Información completa */}
            <div className={styles.leftColumn}>
              <ImageCarousel 
                images={product.images || [product.image]}
                productName={product.name}
              />
              
              <ProductInfo product={product} />
              
              <ProductReviews productId={product.id} />
            </div>

            {/* Columna derecha - Resumen y acciones */}
            <div className={styles.rightColumn}>
              <ProductSummary product={product} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ProductPage({ params }) {
  return (
    <Suspense fallback={
      <div>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Cargando producto...
            </div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <ProductData slug={params.slug} />
    </Suspense>
  );
} 