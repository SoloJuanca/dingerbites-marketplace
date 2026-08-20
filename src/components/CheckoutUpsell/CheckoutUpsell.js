'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import Icon from '../Icon/Icon';
import styles from './CheckoutUpsell.module.css';

function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(Number(price) || 0);
}

export default function CheckoutUpsell({ cartItems = [] }) {
  const { addToCartWithSync } = useCart();
  const { user, apiRequest } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUpsellProducts() {
      try {
        setLoading(true);
        setError('');
        const exclude = cartItems.map((item) => item.id).filter(Boolean).join(',');
        const params = new URLSearchParams();
        if (exclude) params.set('exclude', exclude);
        const response = await fetch(`/api/checkout/upsell?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch upsell products');
        const data = await response.json();
        if (cancelled) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (err) {
        console.error('Error loading checkout upsell:', err);
        if (!cancelled) {
          setProducts([]);
          setError('No pudimos cargar sugerencias en este momento.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUpsellProducts();
    return () => {
      cancelled = true;
    };
  }, [cartItems]);

  const handleAdd = async (product) => {
    setAddingId(product.id);
    try {
      await addToCartWithSync(
        {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          stock_quantity: product.stock_quantity
        },
        user,
        apiRequest
      );
      toast.success('Producto agregado al carrito');
      setProducts((prev) => prev.filter((item) => item.id !== product.id));
    } catch (err) {
      console.error('Error adding upsell product:', err);
      toast.error('No se pudo agregar el producto');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <section className={styles.section} aria-label="Sugerencias de productos">
        <div className={styles.header}>
          <h2 className={styles.title}>¿Agregar algo más?</h2>
        </div>
        <div className={styles.stateBox}>
          <Icon name="autorenew" size={24} className={styles.loadingIcon} aria-hidden />
          <span>Cargando sugerencias...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.section} aria-label="Sugerencias de productos">
        <div className={styles.header}>
          <h2 className={styles.title}>¿Agregar algo más?</h2>
        </div>
        <div className={styles.stateBox}>{error}</div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="Sugerencias de productos">
      <div className={styles.header}>
        <h2 className={styles.title}>¿Agregar algo más?</h2>
        <p className={styles.subtitle}>Productos nuevos y populares que podrían interesarte.</p>
      </div>

      <div className={styles.track}>
        {products.map((product) => (
          <article key={product.id} className={styles.card}>
            <div className={styles.imageWrap}>
              <Image
                src={product.image}
                alt={product.name}
                width={160}
                height={120}
                className={styles.image}
              />
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.name}>{product.name}</h3>
              <p className={styles.price}>{formatPrice(product.price)}</p>
              <button
                type="button"
                className={styles.addButton}
                onClick={() => handleAdd(product)}
                disabled={addingId === product.id}
              >
                {addingId === product.id ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
