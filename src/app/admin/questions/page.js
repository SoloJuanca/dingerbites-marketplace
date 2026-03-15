'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout/AdminLayout';
import styles from './questions.module.css';

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function AdminQuestionsContent() {
  const { apiRequest, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const selectedQuestionId = String(searchParams.get('questionId') || '').trim();

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit)
      });

      if (filter !== 'all') params.set('status', filter);
      if (search.trim()) params.set('search', search.trim());
      if (selectedQuestionId) params.set('questionId', selectedQuestionId);

      const response = await apiRequest(`/api/admin/questions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar las preguntas');
      }

      const data = await response.json();
      const items = Array.isArray(data?.questions) ? data.questions : [];
      setQuestions(items);
      setPagination((prev) => ({
        ...prev,
        total: data?.pagination?.total || 0,
        totalPages: data?.pagination?.totalPages || 0
      }));
      setDrafts((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = item.answer || '';
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Error loading admin questions:', error);
      toast.error(error.message || 'Error al cargar preguntas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadQuestions();
    }
  }, [isAuthenticated, pagination.page, filter, selectedQuestionId]);

  const handleSubmitAnswer = async (questionId) => {
    const answer = String(drafts[questionId] || '').trim();
    if (!answer) {
      toast.error('Escribe una respuesta');
      return;
    }

    try {
      setSavingId(questionId);
      const response = await apiRequest(`/api/admin/questions/${questionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ answer })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo responder la pregunta');
      }
      toast.success('Pregunta respondida');
      await loadQuestions();
    } catch (error) {
      console.error('Error answering question:', error);
      toast.error(error.message || 'Error al responder pregunta');
    } finally {
      setSavingId('');
    }
  };

  return (
    <AdminLayout title="Preguntas de productos">
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <label htmlFor="qa-status">Estado</label>
            <select
              id="qa-status"
              className={styles.select}
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="answered">Respondidas</option>
            </select>
          </div>

          <div className={styles.searchGroup}>
            <label htmlFor="qa-search">Buscar</label>
            <input
              id="qa-search"
              className={styles.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar en pregunta/respuesta"
            />
          </div>

          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setPagination((prev) => ({ ...prev, page: 1 }));
              loadQuestions();
            }}
          >
            Aplicar
          </button>
        </div>

        {loading ? (
          <div className={styles.state}>Cargando preguntas...</div>
        ) : questions.length === 0 ? (
          <div className={styles.state}>No hay preguntas en este momento.</div>
        ) : (
          <div className={styles.list}>
            {questions.map((item) => {
              const isSelected = selectedQuestionId && selectedQuestionId === String(item.id);
              const isPending = item.status !== 'answered';
              return (
                <article
                  key={item.id}
                  className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                >
                  <header className={styles.cardHeader}>
                    <div>
                      <p className={styles.productName}>{item.product_name || 'Producto'}</p>
                      <p className={styles.meta}>
                        {item.user_name || item.user_email || 'Usuario'} · {formatDate(item.created_at)}
                      </p>
                    </div>
                    <span className={`${styles.badge} ${isPending ? styles.badgePending : styles.badgeAnswered}`}>
                      {isPending ? 'Pendiente' : 'Respondida'}
                    </span>
                  </header>

                  <p className={styles.question}>{item.question}</p>

                  <div className={styles.answerBlock}>
                    <label htmlFor={`answer-${item.id}`}>Respuesta del admin</label>
                    <textarea
                      id={`answer-${item.id}`}
                      className={styles.textarea}
                      rows={4}
                      value={drafts[item.id] || ''}
                      onChange={(event) =>
                        setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                    />
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.meta}>
                      {item.answered_at ? `Respondida: ${formatDate(item.answered_at)}` : 'Sin respuesta'}
                    </span>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={() => handleSubmitAnswer(item.id)}
                      disabled={savingId === item.id}
                    >
                      {savingId === item.id ? 'Guardando...' : 'Guardar respuesta'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.button}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
            >
              Anterior
            </button>
            <span className={styles.meta}>
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              className={styles.button}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminQuestionsPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout title="Preguntas de productos">
          <div className={styles.container}><p>Cargando...</p></div>
        </AdminLayout>
      }
    >
      <AdminQuestionsContent />
    </Suspense>
  );
}
