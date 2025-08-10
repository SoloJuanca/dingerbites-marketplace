'use client';

import { useCart } from '../../lib/CartContext';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import CartItems from '../../components/CartItems/CartItems';
import CartSummary from '../../components/CartSummary/CartSummary';
import styles from './cart.module.css';

export default function CartPage() {
  const { items, getTotalItems } = useCart();

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Carrito de Compras</h1>
            <p className={styles.subtitle}>
              {getTotalItems() === 0 
                ? 'Tu carrito está vacío' 
                : `Tienes ${getTotalItems()} producto${getTotalItems() > 1 ? 's' : ''} en tu carrito`
              }
            </p>
          </div>

          {items.length === 0 ? (
            <div className={styles.emptyCart}>
              <div className={styles.emptyCartContent}>
                <h2>Tu carrito está vacío</h2>
                <p>¡Agrega algunos productos para comenzar!</p>
                <Link href="/catalog">
                  <span className={styles.continueShopping}>
                    Continuar Comprando
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.cartContent}>
              <div className={styles.cartLeft}>
                <CartItems />
              </div>
              <div className={styles.cartRight}>
                <CartSummary />
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
} 