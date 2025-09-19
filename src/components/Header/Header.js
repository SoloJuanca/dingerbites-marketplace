'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { getTotalItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoText} onClick={closeMenu}>
            <Image src="/logo.png" alt="Logo" width={100} height={100} />
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Inicio</Link>
          <Link href="/catalog" className={styles.navLink}>Catálogo</Link>
          <Link href="/about" className={styles.navLink}>Nosotros</Link>
          <Link href="/contact" className={styles.navLink}>Contacto</Link>
        </nav>

        <div className={styles.actions}>
          {isClient ? (
            <>
              {isAuthenticated ? (
                <div className={styles.userActions}>
                  <Link href="/profile" className={styles.userBtn} title={`Hola, ${user?.first_name}`}>
                    <Icon name="person" size={24} />
                    <span className={styles.userName}>{user?.first_name}</span>
                  </Link>
                  <button 
                    onClick={logout} 
                    className={styles.logoutBtn}
                    title="Cerrar sesión"
                  >
                    <Icon name="logout" size={20} />
                  </button>
                </div>
              ) : (
                <div className={styles.authActions}>
                  <Link href="/auth/login" className={styles.authBtn}>
                    <Icon name="person" size={20} />
                    <span>Iniciar Sesión</span>
                  </Link>
                </div>
              )}
              <Link href="/cart" className={styles.cartBtn}>
                <Icon name="shopping_cart" size={24} />
                {getTotalItems() > 0 && (
                  <span className={styles.cartBadge}>{getTotalItems()}</span>
                )}
              </Link>
            </>
          ) : (
            // Renderizado inicial del servidor - estado neutral
            <>
              <div className={styles.authActions}>
                <Link href="/auth/login" className={styles.authBtn}>
                  <Icon name="person" size={20} />
                  <span>Iniciar Sesión</span>
                </Link>
              </div>
              <Link href="/cart" className={styles.cartBtn}>
                <Icon name="shopping_cart" size={24} />
              </Link>
            </>
          )}
          {/* Hamburger menu button */}
          <button 
            className={styles.hamburger}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className={`${styles.hamburgerLine} ${isMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
            <span className={`${styles.hamburgerLine} ${isMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
            <span className={`${styles.hamburgerLine} ${isMenuOpen ? styles.hamburgerLineOpen : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className={`${styles.mobileNav} ${isMenuOpen ? styles.mobileNavOpen : ''}`}>
        <Link href="/" className={styles.mobileNavLink} onClick={closeMenu}>Inicio</Link>
        <Link href="/catalog" className={styles.mobileNavLink} onClick={closeMenu}>Catálogo</Link>
        <Link href="/about" className={styles.mobileNavLink} onClick={closeMenu}>Nosotros</Link>
        <Link href="/contact" className={styles.mobileNavLink} onClick={closeMenu}>Contacto</Link>
        {isClient ? (
          <>
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={styles.mobileNavLink} onClick={closeMenu}>
                  Mi Perfil
                </Link>
                <button 
                  onClick={() => { logout(); closeMenu(); }} 
                  className={styles.mobileNavLink}
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <Link href="/auth/login" className={styles.mobileNavLink} onClick={closeMenu}>
                Iniciar Sesión
              </Link>
            )}
          </>
        ) : (
          <Link href="/auth/login" className={styles.mobileNavLink} onClick={closeMenu}>
            Iniciar Sesión
          </Link>
        )}
      </nav>
    </header>
  );
} 