'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import { isRiftboundProduct } from '../../lib/productImages';
import Icon from '../Icon/Icon';
import ProductImage from '../ProductImage/ProductImage';
import styles from './CheckoutUpsell.module.css';

function formatPrice(price) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0
  }).format(Number(price) || 0);
}

export default function CheckoutUpsell({ cartItems = [], isOpen, onClose }) {
  const { addToCartWithSync } = useCart();
  const { user, apiRequest } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
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
        if (!cancelled) setProducts(Array.isArray(data.products) ? data.products : []);
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
  }, [cartItems, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
          stock_quantity: product.stock_quantity,
          is_riftbound: isRiftboundProduct(product)
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

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="upsell-title">
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <div className={styles.header}>
          <h2 id="upsell-title" className={styles.title}>¿Agregar algo más?</h2>
          <p className={styles.subtitle}>Antes de continuar, revisa estas sugerencias.</p>
        </div>

        {loading ? (
          <div className={styles.stateBox}>
            <Icon name="autorenew" size={24} className={styles.loadingIcon} aria-hidden />
            <span>Cargando sugerencias...</span>
          </div>
        ) : error ? (
          <div className={styles.stateBox}>{error}</div>
        ) : products.length > 0 ? (
          <div className={styles.track}>
            {products.map((product) => (
              <article key={product.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    width={160}
                    height={120}
                    className={styles.image}
                    product={product}
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
        ) : (
          <div className={styles.stateBox}>No hay sugerencias disponibles. Puedes continuar con tu pedido.</div>
        )}

        <div className={styles.modalActions}>
          <button type="button" className={styles.keepShoppingButton} onClick={onClose}>
            Seguir revisando
          </button>
          <Link href="/checkout" className={styles.continueButton} onClick={onClose}>
            Continuar al checkout
          </Link>
        </div>
      </section>
    </div>
  );
}
