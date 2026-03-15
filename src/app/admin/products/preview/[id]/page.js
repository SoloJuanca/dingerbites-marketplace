'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '../../../../../components/admin/AdminLayout/AdminLayout';
import Header from '../../../../../components/Header/Header';
import Footer from '../../../../../components/Footer/Footer';
import ImageCarousel from '../../../../../components/ImageCarousel/ImageCarousel';
import ProductInfo from '../../../../../components/ProductInfo/ProductInfo';
import ProductSummary from '../../../../../components/ProductSummary/ProductSummary';
import { useAuth } from '../../../../../lib/AuthContext';
import styles from './preview.module.css';

function normalizeProduct(adminProduct) {
  if (!adminProduct) return null;
  const images = Array.isArray(adminProduct.images)
    ? adminProduct.images.map((img) => (typeof img === 'string' ? img : img?.image_url || img?.url)).filter(Boolean)
    : [];
  return {
    ...adminProduct,
    images,
    image: images[0] || null,
    category: adminProduct.category_name ?? adminProduct.category,
    brand: adminProduct.brand_name ?? adminProduct.brand
  };
}

export default function PreviewProductPage() {
  const { id } = useParams();
  const { apiRequest } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiRequest(`/api/admin/products/${id}`);
        if (!response.ok) {
          if (response.status === 404) setError('not_found');
          else setError('error');
          return;
        }
        const data = await response.json();
        if (!cancelled && data.product) {
          setProduct(normalizeProduct(data.product));
        }
      } catch (e) {
        if (!cancelled) setError('error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, apiRequest]);

  if (loading) {
    return (
      <AdminLayout title="Vista previa">
        <div className={styles.container}>
          <p>Cargando vista previa...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !product) {
    return (
      <AdminLayout title="Vista previa">
        <div className={styles.container}>
          <div className={styles.error}>
            <h1>No se pudo cargar el producto</h1>
            <p>{error === 'not_found' ? 'El borrador no existe o fue eliminado.' : 'Error al cargar. Intenta de nuevo.'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Vista previa del producto">
      <div className={styles.banner}>
        Vista previa del borrador. Los clientes no pueden ver este producto hasta que lo publiques.
      </div>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.productLayout}>
            <div className={styles.leftColumn}>
              <ImageCarousel images={product.images} productName={product.name} />
              <ProductInfo
                product={product}
                marketPriceMxn={null}
                isTcgProduct={!!product.tcg_product_id}
              />
            </div>
            <div className={styles.rightColumn}>
              <ProductSummary
                product={product}
                marketPriceMxn={null}
                isTcgProduct={!!product.tcg_product_id}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </AdminLayout>
  );
}
