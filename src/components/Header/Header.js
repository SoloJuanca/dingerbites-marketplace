'use client';

import { useState, useEffect } from 'react';
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Icon from '../Icon/Icon';
import { useCart } from '../../lib/CartContext';
import { useAuth } from '../../lib/AuthContext';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { getTotalItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const userMenuRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    logout();
  };
  console.log(user);
  const isAdminUser = user?.role === 'admin' || user?.role === 'superadmin' || user?.is_admin === true;
  const displayName = user?.first_name || user?.email?.split('@')[0] || 'Mi cuenta';
  const userInitial = displayName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoText} onClick={closeMenu}>
            <Image src="/logo-wildshot.png" alt="Dingerbites" width={64} height={64} priority />
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Inicio</Link>
          <Link href="/catalog" className={styles.navLink}>Catálogo</Link>
          <Link href="/#reviews" className={styles.navLink}>Reseñas</Link>
          <Link href="/contact" className={styles.navLink}>Contacto</Link>
        </nav>

        <div className={styles.actions}>
          {isClient ? (
            <>
              {isAuthenticated ? (
                <div className={styles.userActions}>
                  <div className={styles.userMenu} ref={userMenuRef}>
                    <button
                      className={styles.userMenuTrigger}
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                      aria-expanded={isUserMenuOpen}
                      aria-haspopup="menu"
                      title={`Hola, ${displayName}`}
                    >
                      {user?.profile_image ? (
                        <Image
                          src={user.profile_image}
                          alt={displayName}
                          width={32}
                          height={32}
                          className={styles.avatarImage}
                        />
                      ) : (
                        <span className={styles.avatarFallback}>{userInitial}</span>
                      )}
                      <span className={styles.userName}>{displayName}</span>
                      <Icon name="expand_more" size={18} />
                    </button>

                    {isUserMenuOpen && (
                      <div className={styles.userDropdown} role="menu">
                        <Link href="/profile" className={styles.userDropdownItem} onClick={() => setIsUserMenuOpen(false)}>
                          <Icon name="person" size={18} />
                          Mi perfil
                        </Link>
                        <Link href="/profile?tab=wishlist" className={styles.userDropdownItem} onClick={() => setIsUserMenuOpen(false)}>
                          <Icon name="favorite" size={18} />
                          Favoritos
                        </Link>
                        {isAdminUser && (
                          <Link href="/admin" className={styles.userDropdownItem} onClick={() => setIsUserMenuOpen(false)}>
                            <Icon name="admin_panel_settings" size={18} />
                            Administrador
                          </Link>
                        )}
                        <button onClick={handleLogout} className={styles.userDropdownItemLogout}>
                          <Icon name="logout" size={18} />
                          Cerrar sesión
                        </button>
                      </div>
                    )}
                  </div>
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
        <Link href="/#reviews" className={styles.mobileNavLink} onClick={closeMenu}>Reseñas</Link>
        <Link href="/contact" className={styles.mobileNavLink} onClick={closeMenu}>Contacto</Link>
        {isClient ? (
          <>
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={styles.mobileNavLink} onClick={closeMenu}>
                  Mi Perfil
                </Link>
                <Link href="/profile?tab=wishlist" className={styles.mobileNavLink} onClick={closeMenu}>
                  Favoritos
                </Link>
                {isAdminUser && (
                  <Link href="/admin" className={styles.mobileNavLink} onClick={closeMenu}>
                    Administrador
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
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