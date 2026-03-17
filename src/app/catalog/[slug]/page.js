'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import ImageCarousel from '../../../components/ImageCarousel/ImageCarousel';
import ProductInfo from '../../../components/ProductInfo/ProductInfo';
import ProductReviews from '../../../components/ProductReviews/ProductReviews';
import ProductSummary from '../../../components/ProductSummary/ProductSummary';
import ProductQuestions from '../../../components/ProductQuestions/ProductQuestions';
import ProductStickyPurchaseBar from '../../../components/ProductStickyPurchaseBar/ProductStickyPurchaseBar';
import Icon from '../../../components/Icon/Icon';
import styles from './product.module.css';

// Client Component para obtener datos del producto
function ProductData({ slug }) {
  const [product, setProduct] = useState(null);
  const [marketPriceMxn, setMarketPriceMxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPurchasePanelOpen, setIsPurchasePanelOpen] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        setMarketPriceMxn(null);

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

        if (productData.tcg_product_id) {
          const priceRes = await fetch(`/api/tcg/product/${productData.id}/market-price`);
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            setMarketPriceMxn(priceData.marketPriceMxn);
          }
        }
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

  useEffect(() => {
    if (!isPurchasePanelOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isPurchasePanelOpen]);

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
                isTcgProduct={!!product.tcg_product_id}
              />
              
              <ProductInfo product={product} marketPriceMxn={marketPriceMxn} isTcgProduct={!!product.tcg_product_id} />
              
              <ProductReviews productId={product.id} />

              <ProductQuestions productId={product.id} productSlug={product.slug} />
            </div>

            {/* Columna derecha - Resumen y acciones */}
            <div className={styles.rightColumn}>
              <ProductSummary product={product} marketPriceMxn={marketPriceMxn} isTcgProduct={!!product.tcg_product_id} />
            </div>
          </div>
        </div>

        <div className={styles.mobileStickyBar}>
          <ProductStickyPurchaseBar
            product={product}
            marketPriceMxn={marketPriceMxn}
            isTcgProduct={!!product.tcg_product_id}
            onOpenPanel={() => setIsPurchasePanelOpen(true)}
          />
        </div>

        {isPurchasePanelOpen && (
          <div
            className={styles.purchaseModalOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Panel de compra"
            onClick={() => setIsPurchasePanelOpen(false)}
          >
            <div
              className={styles.purchaseModalContent}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsPurchasePanelOpen(false)}
                aria-label="Cerrar panel de compra"
              >
                <Icon name="close" size={20} />
              </button>
              <ProductSummary product={product} marketPriceMxn={marketPriceMxn} isTcgProduct={!!product.tcg_product_id} />
            </div>
          </div>
        )}
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