'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/AuthContext';
import styles from './ProductQuestions.module.css';

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function ProductQuestions({ productId, productSlug }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const { isAuthenticated, apiRequest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const loadQuestions = async () => {
    if (!productSlug) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/products/${encodeURIComponent(productSlug)}/questions`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch product questions');
      }
      const data = await response.json();
      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
    } catch (error) {
      console.error('Error loading product questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [productSlug]);

  const handleSubmitQuestion = async (event) => {
    event.preventDefault();
    const content = questionText.trim();
    if (!content) {
      toast.error('Escribe una pregunta');
      return;
    }

    if (!isAuthenticated) {
      const redirect = pathname || (productSlug ? `/catalog/${productSlug}` : '/catalog');
      router.push(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiRequest(`/api/products/${encodeURIComponent(productSlug)}/questions`, {
        method: 'POST',
        body: JSON.stringify({ question: content })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo enviar la pregunta');
      }

      setQuestionText('');
      toast.success('Pregunta enviada. Un administrador te responderá pronto.');
      await loadQuestions();
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error(error.message || 'No se pudo enviar la pregunta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.section} aria-label="Preguntas y respuestas">
      <h3 className={styles.title}>Preguntas y respuestas</h3>

      <form className={styles.form} onSubmit={handleSubmitQuestion}>
        <label htmlFor="product-question-input" className={styles.label}>
          Haz una pregunta sobre este producto
        </label>
        <textarea
          id="product-question-input"
          className={styles.textarea}
          rows={4}
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          placeholder="Ejemplo: ¿Este producto incluye garantía?"
          maxLength={500}
          disabled={submitting}
        />
        <div className={styles.formFooter}>
          <span className={styles.helperText}>
            {isAuthenticated
              ? 'Solo el vendedor puede responder preguntas.'
              : 'Inicia sesión para poder publicar una pregunta.'}
          </span>
          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? 'Enviando...' : 'Publicar pregunta'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className={styles.state}>Cargando preguntas...</div>
      ) : questions.length === 0 ? (
        <div className={styles.state}>Aún no hay preguntas respondidas para este producto.</div>
      ) : (
        <div className={styles.list}>
          {questions.map((item) => (
            <article key={item.id} className={styles.item}>
              <p className={styles.question}>{item.question}</p>
              <p className={styles.answer}>{item.answer}</p>
              <p className={styles.meta}>
                Respondido el {formatDate(item.answered_at || item.created_at)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
