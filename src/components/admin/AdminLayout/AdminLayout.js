'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import Header from '../../Header/Header';
import Footer from '../../Footer/Footer';
import AdminSidebar from '../AdminSidebar/AdminSidebar';
import styles from './AdminLayout.module.css';

export default function AdminLayout({ children, title = 'Panel de Administración' }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      
      if (user?.role !== 'admin' && user?.role !== 'superadmin') {
        toast.error('Acceso denegado. Se requieren permisos de administrador.');
        router.push('/');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className={styles.container}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Verificando permisos...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Redirect if not admin (handled in useEffect, but this is a fallback)
  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Header />
      
      <div className={styles.adminWrapper}>
        <AdminSidebar 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar} 
        />
        
        <main className={styles.mainContent}>
          <div className={styles.contentHeader}>
            <div className={styles.headerLeft}>
              <button 
                className={styles.menuToggle}
                onClick={toggleSidebar}
              >
                ☰
              </button>
              <h1 className={styles.pageTitle}>{title}</h1>
            </div>
            
            <div className={styles.headerRight}>
              <div className={styles.userInfo}>
                <span className={styles.userRole}>Administrador</span>
                <span className={styles.userName}>
                  {user.first_name} {user.last_name}
                </span>
              </div>
            </div>
          </div>
          
          <div className={styles.contentBody}>
            {children}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
