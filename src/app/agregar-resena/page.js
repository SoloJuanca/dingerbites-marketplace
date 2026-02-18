'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import styles from './agregar-resena.module.css';

export default function AgregarResenaPage() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [tokenValid, setTokenValid] = useState(null);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenFromUrl) {
      setTokenValid(false);
      return;
    }
    fetch(`/api/reviews/token?token=${encodeURIComponent(tokenFromUrl)}`)
      .then((res) => res.json())
      .then((data) => setTokenValid(data.valid === true))
      .catch(() => setTokenValid(false));
  }, [tokenFromUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !rating || !comment.trim()) {
      setError('Nombre, calificación y comentario son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await fetch('/api/upload/review', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Error al subir la imagen');
        imageUrl = uploadData.url;
      }
      const res = await fetch('/api/reviews/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenFromUrl,
          author_name: name.trim(),
          rating,
          comment: comment.trim(),
          image_url: imageUrl,
          location: location.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar la reseña');
      setSuccess(true);
      setName('');
      setRating(0);
      setComment('');
      setLocation('');
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError(err.message || 'No se pudo enviar la reseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.successCard}>
              <Icon name="check_circle" size={64} className={styles.successIcon} />
              <h1 className={styles.successTitle}>¡Gracias por tu reseña!</h1>
              <p className={styles.successText}>
                Tu reseña se ha publicado correctamente. Compártela con quien quieras.
              </p>
              <Link href="/#reviews" className={styles.backLink}>Ver reseñas</Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (tokenValid === null) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.loadingMsg}>Verificando enlace...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (tokenValid === false) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.invalidCard}>
              <Icon name="link_off" size={64} className={styles.invalidIcon} />
              <h1 className={styles.invalidTitle}>Enlace no válido</h1>
              <p className={styles.invalidText}>
                Este enlace de reseña no es válido o ya fue utilizado. Si compraste en persona, pide a la tienda que te comparta un nuevo enlace.
              </p>
              <Link href="/" className={styles.backLink}>Ir al inicio</Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.title}>¿Compraste en persona?</h1>
            <p className={styles.subtitle}>
              Comparte tu experiencia. Tu reseña ayuda a otros y nos ayuda a mejorar. Puedes agregar una foto de tu compra si quieres.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>Tu nombre *</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                placeholder="Ej. María García"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Calificación *</label>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={styles.starBtn}
                    onClick={() => setRating(star)}
                    aria-label={star + ' estrellas'}
                  >
                    <Icon
                      name="star"
                      size={32}
                      className={rating >= star ? styles.starFilled : styles.starEmpty}
                      filled={rating >= star}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="comment" className={styles.label}>Tu reseña *</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={styles.textarea}
                placeholder="Cuéntanos sobre tu experiencia..."
                rows={5}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="location" className={styles.label}>Ciudad o estado (opcional)</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={styles.input}
                placeholder="Ej. Monterrey"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Foto (opcional)</label>
              <p className={styles.hint}>Puedes subir una imagen de tu compra. Máx. 3 MB, JPG/PNG/WebP.</p>
              <div className={styles.fileRow}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                />
                {imagePreview && (
                  <div className={styles.previewWrap}>
                    <img src={imagePreview} alt="Vista previa" className={styles.previewImg} />
                    <button
                      type="button"
                      className={styles.removeImg}
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      aria-label="Quitar imagen"
                    >
                      <Icon name="close" size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Enviando...' : 'Publicar reseña'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
