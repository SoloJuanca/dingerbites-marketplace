'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../lib/AuthContext';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import styles from './orders-detail.module.css';

const STATUS_COLORS = {
  pending: '#fbbf24',
  confirmed: '#6b21a8',
  processing: '#8b5cf6',
  shipped: '#10b981',
  delivered: '#059669',
  cancelled: '#ef4444',
  refunded: '#6b7280',
};

function getStatusColor(statusName) {
  return STATUS_COLORS[statusName] || '#6b7280';
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

function getStatusLabel(statusName) {
  return STATUS_LABELS[statusName] || statusName;
}

export default function ClientOrderDetail() {
  const router = useRouter();
  const params = useParams();
  const { apiRequest, isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadOrder();
    }
  }, [isAuthenticated, params.id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/orders/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setOrderItems(data.items || []);
      } else if (response.status === 404 || response.status === 403) {
        setNotFound(true);
      } else {
        toast.error('Error al cargar el pedido');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Cargando...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Cargando pedido...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !order) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.errorState}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d1d5db' }}>receipt_long</span>
              <h2>Pedido no encontrado</h2>
              <p>No se encontró el pedido o no tienes permiso para verlo.</p>
              <Link href="/profile?tab=orders" className={styles.backLink}>
                Volver a Mis Pedidos
              </Link>
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
          {/* Back link */}
          <Link href="/profile?tab=orders" className={styles.backLink}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
            Volver a Mis Pedidos
          </Link>

          {/* Order header */}
          <div className={styles.orderHeader}>
            <div className={styles.orderHeaderLeft}>
              <h1 className={styles.orderTitle}>Pedido {order.order_number}</h1>
              <p className={styles.orderDate}>{formatDate(order.created_at)}</p>
            </div>
            <span
              className={styles.statusBadge}
              style={{ backgroundColor: getStatusColor(order.status_name) }}
            >
              {getStatusLabel(order.status_name)}
            </span>
          </div>

          <div className={styles.content}>
            {/* Order Items */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Productos</h2>
              {orderItems.length > 0 ? (
                <div className={styles.itemsList}>
                  {orderItems.map((item, index) => (
                    <div key={index} className={styles.itemCard}>
                      <div className={styles.itemInfo}>
                        <h3 className={styles.itemName}>{item.product_name || 'Producto'}</h3>
                        {item.variant_name && (
                          <p className={styles.itemVariant}>{item.variant_name}</p>
                        )}
                        <p className={styles.itemQty}>
                          Cantidad: {item.quantity} &times; {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <div className={styles.itemTotal}>
                        {formatCurrency(item.total_price)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>No hay productos en este pedido.</p>
              )}
            </section>

            {/* Financial Summary */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Resumen</h2>
              <div className={styles.financialSummary}>
                <div className={styles.financialRow}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.tax_amount > 0 && (
                  <div className={styles.financialRow}>
                    <span>Impuestos</span>
                    <span>{formatCurrency(order.tax_amount)}</span>
                  </div>
                )}
                {order.shipping_amount > 0 && (
                  <div className={styles.financialRow}>
                    <span>Envío</span>
                    <span>{formatCurrency(order.shipping_amount)}</span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className={styles.financialRow}>
                    <span>Descuento</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className={styles.financialRowTotal}>
                  <strong>Total</strong>
                  <strong>{formatCurrency(order.total_amount)}</strong>
                </div>
              </div>
            </section>

            {/* Order details */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Detalles del Pedido</h2>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Método de pago</span>
                  <span className={styles.detailValue}>{order.payment_method || 'No especificado'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Estado de pago</span>
                  <span className={styles.detailValue}>{order.payment_status || '—'}</span>
                </div>
                {order.shipping_method && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Método de envío</span>
                    <span className={styles.detailValue}>{order.shipping_method}</span>
                  </div>
                )}
                {(order.tracking_id || order.tracking_number) && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Número de seguimiento</span>
                    <span className={styles.detailValue}>{order.tracking_id || order.tracking_number}</span>
                  </div>
                )}
                {order.carrier_company && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Paquetería</span>
                    <span className={styles.detailValue}>{order.carrier_company}</span>
                  </div>
                )}
                {order.tracking_url && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Rastreo</span>
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.trackingLink}
                    >
                      Ver rastreo
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Delivery info */}
            {(order.estimated_delivery_date || order.actual_delivery_date || order.scheduled_delivery_date) && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Entrega</h2>
                <div className={styles.detailsGrid}>
                  {order.scheduled_delivery_date && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Fecha programada</span>
                      <span className={styles.detailValue}>
                        {formatDate(order.scheduled_delivery_date)}
                        {order.scheduled_delivery_time && ` — ${order.scheduled_delivery_time}`}
                      </span>
                    </div>
                  )}
                  {order.estimated_delivery_date && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Fecha estimada</span>
                      <span className={styles.detailValue}>{formatDate(order.estimated_delivery_date)}</span>
                    </div>
                  )}
                  {order.actual_delivery_date && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Fecha real de entrega</span>
                      <span className={styles.detailValue}>{formatDate(order.actual_delivery_date)}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Notes */}
            {order.notes && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Notas</h2>
                <div className={styles.notes}>
                  <p>{order.notes}</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
