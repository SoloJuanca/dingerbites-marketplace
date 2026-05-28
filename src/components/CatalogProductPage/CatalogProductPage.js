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

function ProductData({
  slug,
  initialMarketPriceMxn = null,
  initialMarketPriceError = null
}) {
  const [product, setProduct] = useState(null);
  const [marketPriceMxn, setMarketPriceMxn] = useState(initialMarketPriceMxn);
  const [marketPriceError, setMarketPriceError] = useState(initialMarketPriceError || '');
  const [marketPriceLoading, setMarketPriceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);
        setProduct(null);
        setMarketPriceMxn(initialMarketPriceMxn);
        setMarketPriceError(initialMarketPriceError || '');
        setMarketPriceLoading(
          Boolean(initialMarketPriceMxn == null && !initialMarketPriceError)
        );

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
        const isTcg = Boolean(productData.tcg_product_id);
        if (isTcg && initialMarketPriceMxn == null && !initialMarketPriceError) {
          setMarketPriceLoading(true);
        } else if (isTcg && (initialMarketPriceMxn != null || initialMarketPriceError)) {
          setMarketPriceLoading(false);
        } else {
          setMarketPriceLoading(false);
        }
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
  }, [slug, initialMarketPriceMxn, initialMarketPriceError]);

  useEffect(() => {
    if (!product) return;

    if (!product.tcg_product_id) {
      setMarketPriceMxn(null);
      setMarketPriceError('');
      setMarketPriceLoading(false);
      return;
    }

    let active = true;

    async function loadMarketPrice() {
      setMarketPriceMxn(null);
      setMarketPriceError('');
      setMarketPriceLoading(true);

      try {
        const priceRes = await fetch(`/api/tcg/product/${product.id}/market-price`);
        const priceData = await priceRes.json();

        if (!priceRes.ok || priceData.marketPriceMxn == null) {
          throw new Error(priceData.error || priceData.message || 'Precio TCG no disponible');
        }

        if (active) {
          setMarketPriceMxn(priceData.marketPriceMxn);
        }
      } catch (priceError) {
        console.error('Error loading TCG market price:', priceError);
        if (active) {
          setMarketPriceError(
            'No pudimos obtener el precio actualizado desde TCG. La compra esta deshabilitada temporalmente.'
          );
        }
      } finally {
        if (active) {
          setMarketPriceLoading(false);
        }
      }
    }

    loadMarketPrice();

    return () => {
      active = false;
    };
  }, [product]);

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

              <ProductInfo
                product={product}
                marketPriceMxn={marketPriceMxn}
                isTcgProduct={!!product.tcg_product_id}
                marketPriceError={marketPriceError}
                marketPriceLoading={marketPriceLoading}
              />

              <section className={styles.mobileTrustFeatures} aria-label="Beneficios de compra">
                <article className={styles.mobileTrustFeature}>
                  <Icon name="local_shipping" size={20} className={styles.mobileTrustFeatureIcon} />
                  <div className={styles.mobileTrustFeatureText}>
                    <strong>Envío gratis</strong>
                    <span>En pedidos mayores a $2000</span>
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
              <ProductSummary
                product={product}
                marketPriceMxn={marketPriceMxn}
                isTcgProduct={!!product.tcg_product_id}
                marketPriceError={marketPriceError}
                marketPriceLoading={marketPriceLoading}
              />
            </div>
          </div>
        </div>

        <div className={styles.mobileStickyBar}>
          <ProductStickyPurchaseBar
            product={product}
            marketPriceMxn={marketPriceMxn}
            isTcgProduct={!!product.tcg_product_id}
            marketPriceError={marketPriceError}
            marketPriceLoading={marketPriceLoading}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function CatalogProductPage({
  slug,
  initialMarketPriceMxn = null,
  initialMarketPriceError = null
}) {
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
      <ProductData
        slug={slug}
        initialMarketPriceMxn={initialMarketPriceMxn}
        initialMarketPriceError={initialMarketPriceError}
      />
    </Suspense>
  );
}
