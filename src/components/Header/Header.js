'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '../Icon/Icon';
import styles from './Header.module.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <Icon name="palette" size={24} className={styles.logoIcon} />
            Patito Montenegro
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Inicio</Link>
          <Link href="/catalog" className={styles.navLink}>Catálogo</Link>
          <Link href="/services" className={styles.navLink}>Servicios</Link>
          <Link href="/about" className={styles.navLink}>Nosotros</Link>
          <Link href="/contact" className={styles.navLink}>Contacto</Link>
        </nav>

        <div className={styles.actions}>
          <button className={styles.orderBtn}>Comprar Ahora</button>
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
        <Link href="/services" className={styles.mobileNavLink} onClick={closeMenu}>Servicios</Link>
        <Link href="/about" className={styles.mobileNavLink} onClick={closeMenu}>Nosotros</Link>
        <Link href="/contact" className={styles.mobileNavLink} onClick={closeMenu}>Contacto</Link>
      </nav>
    </header>
  );
} 