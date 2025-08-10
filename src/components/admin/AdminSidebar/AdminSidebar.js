'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

export default function AdminSidebar({ isOpen, onToggle }) {
  const pathname = usePathname();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      href: '/admin',
      exact: true
    },
    {
      id: 'products',
      label: 'Productos',
      icon: '📦',
      href: '/admin/products',
      submenu: [
        { label: 'Todos los Productos', href: '/admin/products' },
        { label: 'Agregar Producto', href: '/admin/products/create' },
        { label: 'Inventario', href: '/admin/products/inventory' }
      ]
    },
    {
      id: 'categories',
      label: 'Categorías',
      icon: '🏷️',
      href: '/admin/categories',
      submenu: [
        { label: 'Todas las Categorías', href: '/admin/categories' },
        { label: 'Agregar Categoría', href: '/admin/categories/create' }
      ]
    },
    {
      id: 'brands',
      label: 'Marcas',
      icon: '🏢',
      href: '/admin/brands',
      submenu: [
        { label: 'Todas las Marcas', href: '/admin/brands' },
        { label: 'Agregar Marca', href: '/admin/brands/create' }
      ]
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: '🛒',
      href: '/admin/orders'
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: '👥',
      href: '/admin/users'
    },
    {
      id: 'analytics',
      label: 'Analíticas',
      icon: '📈',
      href: '/admin/analytics'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: '⚙️',
      href: '/admin/settings'
    }
  ];

  const [expandedMenu, setExpandedMenu] = useState(() => {
    // Find which menu item contains the current path
    const activeItem = menuItems.find(item => 
      item.submenu && item.submenu.some(sub => pathname.startsWith(sub.href))
    );
    return activeItem ? activeItem.id : null;
  });

  const isActiveLink = (href, exact = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const toggleSubmenu = (menuId) => {
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className={styles.overlay}
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>💅</span>
            <span className={styles.logoText}>Patito Admin</span>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onToggle}
          >
            ✕
          </button>
        </div>

        <nav className={styles.navigation}>
          <ul className={styles.menuList}>
            {menuItems.map((item) => (
              <li key={item.id} className={styles.menuItem}>
                {item.submenu ? (
                  <>
                    <button
                      className={`${styles.menuButton} ${
                        isActiveLink(item.href) ? styles.active : ''
                      }`}
                      onClick={() => toggleSubmenu(item.id)}
                    >
                      <span className={styles.menuIcon}>{item.icon}</span>
                      <span className={styles.menuLabel}>{item.label}</span>
                      <span className={`${styles.expandIcon} ${
                        expandedMenu === item.id ? styles.expanded : ''
                      }`}>
                        ▼
                      </span>
                    </button>
                    
                    <ul className={`${styles.submenu} ${
                      expandedMenu === item.id ? styles.submenuOpen : ''
                    }`}>
                      {item.submenu.map((subItem, index) => (
                        <li key={index} className={styles.submenuItem}>
                          <Link
                            href={subItem.href}
                            className={`${styles.submenuLink} ${
                              isActiveLink(subItem.href) ? styles.active : ''
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`${styles.menuLink} ${
                      isActiveLink(item.href, item.exact) ? styles.active : ''
                    }`}
                  >
                    <span className={styles.menuIcon}>{item.icon}</span>
                    <span className={styles.menuLabel}>{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.footerInfo}>
            <span className={styles.footerText}>Panel de Admin</span>
            <span className={styles.footerVersion}>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
