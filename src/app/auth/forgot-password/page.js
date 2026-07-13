'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './forgot-password.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('El email es requerido');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Formato de email inválido');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setIsSent(true);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'No se pudo procesar la solicitud. Intenta nuevamente.');
      }
    } catch (err) {
      setError('Error inesperado. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.box}>
        {isSent ? (
          <>
            <div className={styles.header}>
              <div className={styles.iconSuccess} aria-hidden="true">✓</div>
              <h1 className={styles.title}>Revisa tu correo</h1>
              <p className={styles.subtitle}>
                Si <strong>{email}</strong> está registrado, te enviamos un enlace para
                restablecer tu contraseña. El enlace expira en 24 horas.
              </p>
            </div>

            <div className={styles.footer}>
              <Link href="/auth/login" className={styles.link}>
                Volver a iniciar sesión
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Recuperar contraseña</h1>
              <p className={styles.subtitle}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  className={`${styles.input} ${error ? styles.inputError : ''}`}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'email-error' : undefined}
                />
                {error && (
                  <span id="email-error" className={styles.errorText}>
                    {error}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`${styles.submitBtn} ${isSubmitting ? styles.submitBtnLoading : ''}`}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>

            <div className={styles.footer}>
              <p className={styles.helperText}>
                ¿Recordaste tu contraseña?{' '}
                <Link href="/auth/login" className={styles.link}>
                  Inicia sesión
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
