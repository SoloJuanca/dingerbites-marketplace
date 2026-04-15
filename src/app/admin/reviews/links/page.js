'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from './links.module.css';

export default function AdminReviewLinksPage() {
  const { apiRequest, isAuthenticated } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadLinks();
    }
  }, [isAuthenticated]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/reviews/links');
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links || []);
      } else {
        toast.error('Error al cargar los enlaces');
      }
    } catch (error) {
      console.error('Error loading links:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (creating) return;
    try {
      setCreating(true);
      const response = await apiRequest('/api/reviews/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || null })
      });
      if (response.ok) {
        const data = await response.json();
        const newLink = data.link;
        setLinks((prev) => [newLink, ...prev]);
        setLabel('');
        toast.success('Enlace creado');
        if (newLink.url) {
          await navigator.clipboard.writeText(newLink.url);
          setCopiedId(newLink.id);
          setTimeout(() => setCopiedId(null), 2000);
          toast.success('Enlace copiado al portapapeles');
        }
      } else {
        const err = await response.json();
        toast.error(err.error || 'Error al crear enlace');
      }
    } catch (error) {
      console.error('Error creating link:', error);
      toast.error('Error al crear enlace');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (link) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = link.url || `${baseUrl}/agregar-resena?link=${link.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Enlace copiado');
    } catch (err) {
      toast.error('No se pudo copiar');
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

  return (
    <AdminLayout title="Crear Enlace de Reseña">
      <div className={styles.container}>
        <div className={styles.backLink}>
          <Link href="/admin/reviews">← Volver a Reseñas</Link>
        </div>

        <div className={styles.createSection}>
          <h2 className={styles.sectionTitle}>Crear nuevo enlace</h2>
          <p className={styles.sectionHint}>
            Genera un enlace único que puedes compartir con clientes para que dejen sus reseñas.
            El enlace es reutilizable: varias personas pueden usarlo.
          </p>
          <form onSubmit={handleCreate} className={styles.createForm}>
            <input
              type="text"
              placeholder="Etiqueta (opcional, ej. QR tienda)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={styles.input}
            />
            <button
              type="submit"
              disabled={creating}
              className={styles.createButton}
            >
              {creating ? 'Creando...' : 'Crear enlace'}
            </button>
          </form>
        </div>

        <div className={styles.linksSection}>
          <h2 className={styles.sectionTitle}>Enlaces creados</h2>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Cargando enlaces...</p>
            </div>
          ) : links.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay enlaces creados. Crea uno arriba.</p>
            </div>
          ) : (
            <div className={styles.linksList}>
              {links.map((link) => {
                const url = link.url || `${typeof window !== 'undefined' ? window.location.origin : ''}/agregar-resena?link=${link.token}`;
                return (
                  <div key={link.id} className={styles.linkCard}>
                    <div className={styles.linkInfo}>
                      <span className={styles.linkLabel}>{link.label || 'Sin etiqueta'}</span>
                      <span className={styles.linkDate}>{formatDate(link.created_at)}</span>
                    </div>
                    <div className={styles.linkUrl}>{url}</div>
                    <button
                      type="button"
                      className={styles.copyButton}
                      onClick={() => handleCopy(link)}
                    >
                      {copiedId === link.id ? 'Copiado' : 'Copiar enlace'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
