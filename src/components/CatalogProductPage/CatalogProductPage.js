'use client';

import { Suspense, useState, useEffect } from 'react';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import ImageCarousel from '../ImageCarousel/ImageCarousel';
import ProductInfo from '../ProductInfo/ProductInfo';
import ProductReviews from '../ProductReviews/ProductReviews';
import ProductSummary from '../ProductSummary/ProductSummary';
import ProductQuestions from '../ProductQuestions/ProductQuestions';
import ProductStickyPurchaseBar from '../ProductStickyPurchaseBar/ProductStickyPurchaseBar';
import Icon from '../Icon/Icon';
import styles from './CatalogProductPage.module.css';

function ProductData({ slug }) {
  const [product, setProduct] = useState(null);
  const [marketPriceMxn, setMarketPriceMxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            <div className={styles.leftColumn}>
              <ImageCarousel
                images={product.images || [product.image]}
                productName={product.name}
                isTcgProduct={!!product.tcg_product_id}
              />

              <ProductInfo product={product} marketPriceMxn={marketPriceMxn} isTcgProduct={!!product.tcg_product_id} />

              <section className={styles.mobileTrustFeatures} aria-label="Beneficios de compra">
                <article className={styles.mobileTrustFeature}>
                  <Icon name="local_shipping" size={20} className={styles.mobileTrustFeatureIcon} />
                  <div className={styles.mobileTrustFeatureText}>
                    <strong>Envío gratis</strong>
                    <span>En pedidos mayores a $800</span>
                  </div>
                </article>

                <article className={styles.mobileTrustFeature}>
                  <Icon name="verified_user" size={20} className={styles.mobileTrustFeatureIcon} />
                  <div className={styles.mobileTrustFeatureText}>
                    <strong>Compra segura</strong>
                    <span>Pago protegido y datos cifrados</span>
                  </div>
                </article>

                <article className={styles.mobileTrustFeature}>
                  <Icon name="autorenew" size={20} className={styles.mobileTrustFeatureIcon} />
                  <div className={styles.mobileTrustFeatureText}>
                    <strong>Cambios y devoluciones</strong>
                    <span>Hasta 30 días</span>
                  </div>
                </article>
              </section>

              <ProductReviews productId={product.id} />

              <ProductQuestions productId={product.id} productSlug={product.slug} />
            </div>

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
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function CatalogProductPage({ slug }) {
  return (
    <Suspense
      fallback={
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
      }
    >
      <ProductData slug={slug} />
    </Suspense>
  );
}
