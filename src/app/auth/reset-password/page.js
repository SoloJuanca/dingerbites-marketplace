'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './reset-password.module.css';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState('validating'); // validating | invalid | form | done
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function validate() {
      if (!token.trim()) {
        setStatus('invalid');
        return;
      }
      try {
        const response = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        setStatus(response.ok && data.valid ? 'form' : 'invalid');
      } catch (err) {
        if (active) setStatus('invalid');
      }
    }

    validate();
    return () => {
      active = false;
    };
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatus('done');
      } else {
        setErrors({ submit: data.error || 'No se pudo restablecer la contraseña.' });
      }
    } catch (err) {
      setErrors({ submit: 'Error inesperado. Intenta nuevamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'validating') {
    return (
      <div className={styles.box}>
        <div className={styles.header}>
          <h1 className={styles.title}>Validando enlace...</h1>
          <p className={styles.subtitle}>Un momento, por favor.</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className={styles.box}>
        <div className={styles.header}>
          <div className={styles.iconError} aria-hidden="true">!</div>
          <h1 className={styles.title}>Enlace no válido</h1>
          <p className={styles.subtitle}>
            El enlace para restablecer tu contraseña no es válido o ha expirado.
            Solicita uno nuevo para continuar.
          </p>
        </div>
        <div className={styles.footer}>
          <Link href="/auth/forgot-password" className={styles.link}>
            Solicitar un nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className={styles.box}>
        <div className={styles.header}>
          <div className={styles.iconSuccess} aria-hidden="true">✓</div>
          <h1 className={styles.title}>Contraseña actualizada</h1>
          <p className={styles.subtitle}>
            Tu contraseña se restableció correctamente. Ya puedes iniciar sesión.
          </p>
        </div>
        <div className={styles.footer}>
          <Link href="/auth/login" className={styles.link}>
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nueva contraseña</h1>
        <p className={styles.subtitle}>Ingresa y confirma tu nueva contraseña.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            Nueva contraseña
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && (
            <span className={styles.errorText}>{errors.password}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirmar contraseña
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && (
            <span className={styles.errorText}>{errors.confirmPassword}</span>
          )}
        </div>

        {errors.submit && <div className={styles.submitError}>{errors.submit}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`${styles.submitBtn} ${isSubmitting ? styles.submitBtnLoading : ''}`}
        >
          {isSubmitting ? 'Guardando...' : 'Restablecer contraseña'}
        </button>
      </form>

      <div className={styles.footer}>
        <Link href="/auth/login" className={styles.link}>
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.container}>
      <Suspense
        fallback={
          <div className={styles.box}>
            <div className={styles.header}>
              <h1 className={styles.title}>Cargando...</h1>
            </div>
          </div>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
