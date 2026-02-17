'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import ImageCarousel from '../../../components/ImageCarousel/ImageCarousel';
import ProductInfo from '../../../components/ProductInfo/ProductInfo';
import ProductReviews from '../../../components/ProductReviews/ProductReviews';
import ProductSummary from '../../../components/ProductSummary/ProductSummary';
import styles from './product.module.css';

// Client Component para obtener datos del producto
function ProductData({ slug }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/products/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('not_found');
          } else {
            throw new Error('Failed to fetch product');
          }
          return;
        }
        
        const productData = await response.json();
        setProduct(productData);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('server_error');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadProduct();
    }
  }, [slug]);

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Cargando producto...
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error === 'not_found' || !product) {
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

  if (error === 'server_error') {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.notFound}>
              <h1>Error del servidor</h1>
              <p>Hubo un problema cargando el producto. Por favor intenta de nuevo.</p>
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

export default function ProductPage() {
  const { slug } = useParams();
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
      <ProductData slug={slug} />
    </Suspense>
  );
} 