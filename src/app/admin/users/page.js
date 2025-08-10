'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './users.module.css';

export default function AdminUsers() {
  const router = useRouter();
  const { apiRequest, isAuthenticated } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    verified_users: 0,
    recent_users: 0
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [filters, pagination.page, isAuthenticated]);

  const loadUsers = async () => {
    console.log("loadUsers");
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await apiRequest(`/api/admin/users?${params.toString()}`);
      console.log("response", response);
      if (response.ok) {
        const data = await response.json();
        console.log("data", data);
        setUsers(data.users);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
        setStats(data.stats);
      } else {
        toast.error('Error al cargar los usuarios');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleStatusChange = async (userId, field, value) => {
    try {
      const updateData = { userId };
      updateData[field] = value;

      const response = await apiRequest('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        toast.success('Usuario actualizado correctamente');
        loadUsers(); // Reload users to get updated data
      } else {
        toast.error('Error al actualizar el usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al conectar con el servidor');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return 'No especificado';
    return phone;
  };

  const getStatusColor = (isActive, isVerified) => {
    if (!isActive) return '#ef4444'; // Red for inactive
    if (!isVerified) return '#f59e0b'; // Yellow for unverified
    return '#10b981'; // Green for active and verified
  };

  const getStatusText = (isActive, isVerified) => {
    if (!isActive) return 'Inactivo';
    if (!isVerified) return 'No verificado';
    return 'Activo';
  };

  const getGenderText = (gender) => {
    const genderMap = {
      'male': 'Masculino',
      'female': 'Femenino',
      'other': 'Otro',
      'prefer_not_to_say': 'Prefiero no decir'
    };
    return genderMap[gender] || 'No especificado';
  };

  return (
    <AdminLayout title="Gestión de Usuarios">
      <div className={styles.container}>
        {/* Summary Stats */}
        <div className={styles.summaryStats}>
          <div className={styles.statCard}>
            <h3>Total de Usuarios</h3>
            <p className={styles.statNumber}>{stats.total_users}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Usuarios Activos</h3>
            <p className={styles.statNumber}>{stats.active_users}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Usuarios Verificados</h3>
            <p className={styles.statNumber}>{stats.verified_users}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Activos (30 días)</h3>
            <p className={styles.statNumber}>{stats.recent_users}</p>
          </div>
        </div>

        {/* Filters Section */}
        <div className={styles.filtersSection}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="status">Estado:</label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="verified">Verificados</option>
                <option value="unverified">No verificados</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="search">Buscar:</label>
              <input
                type="text"
                id="search"
                placeholder="Email, nombre, apellido..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="sortBy">Ordenar por:</label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="created_at">Fecha de registro</option>
                <option value="last_login_at">Último acceso</option>
                <option value="email">Email</option>
                <option value="first_name">Nombre</option>
                <option value="last_name">Apellido</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="sortOrder">Orden:</label>
              <select
                id="sortOrder"
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="DESC">Descendente</option>
                <option value="ASC">Ascendente</option>
              </select>
            </div>
          </div>

          <button 
            onClick={loadUsers}
            className={styles.refreshButton}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} Actualizar
          </button>
        </div>

        {/* Users Table */}
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            <>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Información de Contacto</th>
                    <th>Estado</th>
                    <th>Registro</th>
                    <th>Último Acceso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className={styles.userRow}>
                      <td className={styles.userInfo}>
                        <div className={styles.userName}>
                          {user.first_name} {user.last_name}
                        </div>
                        <div className={styles.userEmail}>
                          {user.email}
                        </div>
                        <div className={styles.userDetails}>
                          {user.date_of_birth && (
                            <span>📅 {new Date(user.date_of_birth).toLocaleDateString('es-MX')}</span>
                          )}
                          {user.gender && (
                            <span>👤 {getGenderText(user.gender)}</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.contactInfo}>
                        <div className={styles.phone}>
                          📱 {formatPhone(user.phone)}
                        </div>
                        <div className={styles.verification}>
                          {user.email_verified_at && (
                            <span className={styles.verified}>✓ Email verificado</span>
                          )}
                          {user.phone_verified_at && (
                            <span className={styles.verified}>✓ Teléfono verificado</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.userStatus}>
                        <span 
                          className={styles.statusBadge}
                          style={{ backgroundColor: getStatusColor(user.is_active, user.is_verified) }}
                        >
                          {getStatusText(user.is_active, user.is_verified)}
                        </span>
                      </td>
                      <td className={styles.registrationDate}>
                        {formatDate(user.created_at)}
                      </td>
                      <td className={styles.lastLogin}>
                        {formatDate(user.last_login_at)}
                      </td>
                      <td className={styles.actions}>
                        <div className={styles.statusControls}>
                          <label className={styles.toggleLabel}>
                            <input
                              type="checkbox"
                              checked={user.is_active}
                              onChange={(e) => handleStatusChange(user.id, 'is_active', e.target.checked)}
                              className={styles.toggleInput}
                            />
                            <span className={styles.toggleSlider}></span>
                            Activo
                          </label>
                          
                          <label className={styles.toggleLabel}>
                            <input
                              type="checkbox"
                              checked={user.is_verified}
                              onChange={(e) => handleStatusChange(user.id, 'is_verified', e.target.checked)}
                              className={styles.toggleInput}
                            />
                            <span className={styles.toggleSlider}></span>
                            Verificado
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={styles.paginationButton}
                  >
                    ← Anterior
                  </button>
                  
                  <span className={styles.paginationInfo}>
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className={styles.paginationButton}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination Info */}
        <div className={styles.paginationInfo}>
          <p>
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} usuarios
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
