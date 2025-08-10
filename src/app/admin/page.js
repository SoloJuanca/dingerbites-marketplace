'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout/AdminLayout';
import DashboardStats from '../../components/admin/DashboardStats/DashboardStats';
import RevenueChart from '../../components/admin/RevenueChart/RevenueChart';
import TopProducts from '../../components/admin/TopProducts/TopProducts';
import StockAlerts from '../../components/admin/StockAlerts/StockAlerts';
import RecentOrders from '../../components/admin/RecentOrders/RecentOrders';
import SalesByLocation from '../../components/admin/SalesByLocation/SalesByLocation';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const { user, isAuthenticated, apiRequest } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin')) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/admin/dashboard');
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      } else {
        toast.error('Error al cargar los datos del dashboard');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Cargando datos del dashboard...</p>
        </div>
      ) : dashboardData ? (
        <div className={styles.dashboard}>
          {/* Stats Cards */}
          <DashboardStats stats={dashboardData.stats} />

          {/* Charts and Tables Grid */}
          <div className={styles.chartsGrid}>
            {/* Revenue Chart */}
            <div className={styles.chartCard}>
              <RevenueChart 
                data={dashboardData.revenueTrends}
                monthlyData={dashboardData.monthlyRevenue}
              />
            </div>

            {/* Top Products */}
            <div className={styles.tableCard}>
              <TopProducts products={dashboardData.topProducts} />
            </div>
          </div>

          {/* Second Row */}
          <div className={styles.secondRow}>
            {/* Stock Alerts */}
            <div className={styles.alertsCard}>
              <StockAlerts alerts={dashboardData.stockAlerts} />
            </div>

            {/* Sales by Location */}
            <div className={styles.locationCard}>
              <SalesByLocation locations={dashboardData.salesByLocation} />
            </div>
          </div>

          {/* Recent Orders */}
          <div className={styles.ordersCard}>
            <RecentOrders orders={dashboardData.recentOrders} />
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No se pudieron cargar los datos del dashboard</p>
        </div>
      )}
    </AdminLayout>
  );
}
