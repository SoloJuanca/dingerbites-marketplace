'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './reviews.module.css';

export default function AdminReviewsPage() {
  const { apiRequest, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(''); // '', 'true', 'false'
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadReviews();
    }
  }, [filter, pagination.page, isAuthenticated]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit
      });
      if (filter) params.append('approved', filter);

      const response = await apiRequest(`/api/admin/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        toast.error('Error al cargar las reseñas');
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId, isApproved) => {
    try {
      const response = await apiRequest(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: isApproved })
      });
      if (response.ok) {
        toast.success(isApproved ? 'Reseña aprobada' : 'Reseña rechazada');
        loadReviews();
      } else {
        toast.error('Error al actualizar');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Error al actualizar');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <AdminLayout title="Reseñas">
      <div className={styles.container}>
        <div className={styles.filtersSection}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label>Estado</label>
              <select
                className={styles.filterSelect}
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
              >
                <option value="">Todas</option>
                <option value="true">Aprobadas</option>
                <option value="false">Pendientes / Rechazadas</option>
              </select>
            </div>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={loadReviews}
              disabled={loading}
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Cargando reseñas...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay reseñas.</p>
            </div>
          ) : (
            <div className={styles.reviewsList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewAuthor}>
                      <strong>{review.author_name}</strong>
                      {review.location && (
                        <span className={styles.reviewLocation}> · {review.location}</span>
                      )}
                    </div>
                    <div className={styles.reviewMeta}>
                      <span className={styles.reviewStars}>{renderStars(review.rating)}</span>
                      <span className={styles.reviewDate}>{formatDate(review.created_at)}</span>
                    </div>
                  </div>
                  <p className={styles.reviewComment}>{review.comment}</p>
                  {review.image_url && (
                    <div className={styles.reviewImage}>
                      <img src={review.image_url} alt="Reseña" />
                    </div>
                  )}
                  <div className={styles.reviewActions}>
                    <span
                      className={
                        review.is_approved ? styles.statusApproved : styles.statusPending
                      }
                    >
                      {review.is_approved ? 'Aprobada' : 'Pendiente'}
                    </span>
                    <div className={styles.actionButtons}>
                      {!review.is_approved && (
                        <button
                          type="button"
                          className={styles.approveBtn}
                          onClick={() => handleApprove(review.id, true)}
                        >
                          Aprobar
                        </button>
                      )}
                      {review.is_approved && (
                        <button
                          type="button"
                          className={styles.rejectBtn}
                          onClick={() => handleApprove(review.id, false)}
                        >
                          Rechazar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.paginationButton}
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Anterior
              </button>
              <span className={styles.paginationInfo}>
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                type="button"
                className={styles.paginationButton}
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
