'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

export default function AdminSidebar({ isOpen, onToggle, collapsed = false, onCollapseToggle }) {
  const pathname = usePathname();
  const [flyoutOpen, setFlyoutOpen] = useState(null);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      href: '/admin',
      exact: true
    },
    {
      id: 'products',
      label: 'Productos',
      icon: 'inventory_2',
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
      icon: 'label',
      href: '/admin/categories',
      submenu: [
        { label: 'Todas las Categorías', href: '/admin/categories' },
        { label: 'Agregar Categoría', href: '/admin/categories/create' }
      ]
    },
    {
      id: 'brands',
      label: 'Marcas',
      icon: 'business',
      href: '/admin/brands',
      submenu: [
        { label: 'Todas las Marcas', href: '/admin/brands' },
        { label: 'Agregar Marca', href: '/admin/brands/create' }
      ]
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: 'shopping_cart',
      href: '/admin/orders'
    },
    {
      id: 'coupons',
      label: 'Cupones',
      icon: 'confirmation_number',
      href: '/admin/coupons'
    },
    {
      id: 'reports-payments',
      label: 'Reporte de pagos',
      icon: 'payments',
      href: '/admin/reports/payment-methods'
    },
    {
      id: 'pos',
      label: 'Punto de venta',
      icon: 'point_of_sale',
      href: '/admin/pos'
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: 'group',
      href: '/admin/users'
    },
    {
      id: 'reviews',
      label: 'Reseñas',
      icon: 'star',
      href: '/admin/reviews',
      submenu: [
        { label: 'Todas las Reseñas', href: '/admin/reviews' },
        { label: 'Crear Enlace', href: '/admin/reviews/links' }
      ]
    },
    {
      id: 'banners',
      label: 'Banners',
      icon: 'image',
      href: '/admin/banners'
    },
    {
      id: 'questions',
      label: 'Preguntas',
      icon: 'help',
      href: '/admin/questions'
    },
    {
      id: 'analytics',
      label: 'Analíticas',
      icon: 'trending_up',
      href: '/admin/analytics'
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: 'settings',
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
    if (collapsed) {
      setFlyoutOpen(flyoutOpen === menuId ? null : menuId);
      return;
    }
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

  const closeFlyout = () => setFlyoutOpen(null);

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
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}></span>
            <span className={styles.logoText}>Admin</span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onToggle}
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          {onCollapseToggle && (
            <button
              type="button"
              className={styles.collapseToggle}
              onClick={onCollapseToggle}
              aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
              title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{collapsed ? 'chevron_right' : 'chevron_left'}</span>
            </button>
          )}
        </div>

        <nav className={styles.navigation}>
          <ul className={styles.menuList}>
            {menuItems.map((item) => (
              <li key={item.id} className={styles.menuItem}>
                {item.submenu ? (
                  <>
                    <button
                      type="button"
                      className={`${styles.menuButton} ${
                        isActiveLink(item.href) ? styles.active : ''
                      } ${flyoutOpen === item.id ? styles.flyoutActive : ''}`}
                      onClick={() => toggleSubmenu(item.id)}
                    >
                      <span className={`${styles.menuIcon} material-symbols-outlined`}>{item.icon}</span>
                      <span className={styles.menuLabel}>{item.label}</span>
                      <span className={`${styles.expandIcon} material-symbols-outlined ${
                        (expandedMenu === item.id || flyoutOpen === item.id) ? styles.expanded : ''
                      }`}>
                        expand_more
                      </span>
                    </button>
                    {collapsed && flyoutOpen === item.id && (
                      <div className={styles.flyout} onMouseLeave={closeFlyout}>
                        <ul className={styles.flyoutList}>
                          {item.submenu.map((subItem, index) => (
                            <li key={index}>
                              <Link
                                href={subItem.href}
                                className={`${styles.flyoutLink} ${
                                  isActiveLink(subItem.href) ? styles.active : ''
                                }`}
                                onClick={closeFlyout}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!collapsed && (
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
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`${styles.menuLink} ${
                      isActiveLink(item.href, item.exact) ? styles.active : ''
                    }`}
                  >
                    <span className={`${styles.menuIcon} material-symbols-outlined`}>{item.icon}</span>
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
