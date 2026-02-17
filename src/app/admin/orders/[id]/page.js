'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../lib/AuthContext';
import AdminLayout from '../../../../components/admin/AdminLayout/AdminLayout';
import styles from './order-detail.module.css';

export default function AdminOrderDetail() {
  const router = useRouter();
  const params = useParams();
  const { apiRequest } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [shippingTrackingId, setShippingTrackingId] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');
  const [shippingUrl, setShippingUrl] = useState('');

  useEffect(() => {
    if (params.id) {
      loadOrder();
      loadOrderStatuses();
    }
  }, [params.id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/orders/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setOrderItems(data.items || []);
        setShippingTrackingId(data.order?.tracking_id ?? '');
        setShippingCarrier(data.order?.carrier_company ?? '');
        setShippingUrl(data.order?.tracking_url ?? '');
      } else {
        toast.error('Error al cargar el pedido');
        router.push('/admin/orders');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Error al conectar con el servidor');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderStatuses = async () => {
    try {
      const response = await apiRequest('/api/order-statuses');
      if (response.ok) {
        const data = await response.json();
        setOrderStatuses(data.statuses || []);
      }
    } catch (error) {
      console.error('Error loading order statuses:', error);
    }
  };

  const handleStatusChange = async (newStatusId) => {
    try {
      setUpdating(true);
      const response = await apiRequest(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: newStatusId })
      });

      if (response.ok) {
        toast.success('Estado del pedido actualizado');
        loadOrder();
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveShippingInfo = async () => {
    try {
      setUpdating(true);
      const response = await apiRequest(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_id: order.status_id,
          tracking_id: shippingTrackingId.trim() || null,
          carrier_company: shippingCarrier.trim() || null,
          tracking_url: shippingUrl.trim() || null
        })
      });

      if (response.ok) {
        toast.success('Información de envío guardada');
        loadOrder();
      } else {
        toast.error('Error al guardar la información de envío');
      }
    } catch (error) {
      console.error('Error saving shipping info:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificado';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (statusName) => {
    const statusColors = {
      'pending': '#fbbf24',
      'confirmed': '#3b82f6',
      'processing': '#8b5cf6',
      'shipped': '#10b981',
      'delivered': '#059669',
      'cancelled': '#ef4444',
      'refunded': '#6b7280'
    };
    return statusColors[statusName] || '#6b7280';
  };

  if (loading) {
    return (
      <AdminLayout title="Cargando Pedido...">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Cargando información del pedido...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="Pedido No Encontrado">
        <div className={styles.error}>
          <p>El pedido no fue encontrado</p>
          <button onClick={() => router.push('/admin/orders')} className={styles.backButton}>
            ← Volver a Pedidos
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Pedido ${order.order_number}`}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={() => router.push('/admin/orders')} className={styles.backButton}>
            ← Volver a Pedidos
          </button>
          <div className={styles.orderNumber}>
            <h1>Pedido {order.order_number}</h1>
            <span 
              className={styles.statusBadge}
              style={{ backgroundColor: getStatusColor(order.status_name) }}
            >
              {order.status_name}
            </span>
          </div>
        </div>

        <div className={styles.content}>
          {/* Order Summary */}
          <div className={styles.section}>
            <h2>Resumen del Pedido</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <label>Fecha del Pedido:</label>
                <span>{formatDate(order.created_at)}</span>
              </div>
              <div className={styles.summaryItem}>
                <label>Estado Actual:</label>
                <span>{order.status_name}</span>
              </div>
              <div className={styles.summaryItem}>
                <label>Método de Pago:</label>
                <span>{order.payment_method || 'No especificado'}</span>
              </div>
              <div className={styles.summaryItem}>
                <label>Estado de Pago:</label>
                <span>{order.payment_status || '—'}</span>
              </div>
              <div className={styles.summaryItem}>
                <label>Método de Envío:</label>
                <span>{order.shipping_method || 'No especificado'}</span>
              </div>
              <div className={styles.summaryItem}>
                <label>Número de Seguimiento:</label>
                <span>{order.tracking_id || order.tracking_number || '—'}</span>
              </div>
              {(order.carrier_company || order.tracking_url) && (
                <>
                  {order.carrier_company && (
                    <div className={styles.summaryItem}>
                      <label>Paquetería:</label>
                      <span>{order.carrier_company}</span>
                    </div>
                  )}
                  {order.tracking_url && (
                    <div className={styles.summaryItem}>
                      <label>Seguimiento:</label>
                      <span>
                        <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className={styles.trackingLink}>
                          Ver rastreo
                        </a>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className={styles.section}>
            <h2>Información del Cliente</h2>
            <div className={styles.customerInfo}>
              <div className={styles.customerDetails}>
                <h3>{
                  order.first_name && order.last_name ? 
                    `${order.first_name} ${order.last_name}` : 
                    'Cliente Invitado'
                }</h3>
                <p><strong>Email:</strong> {order.customer_email}</p>
                {order.customer_phone && (
                  <p><strong>Teléfono:</strong> {order.customer_phone}</p>
                )}
                {order.phone && !order.customer_phone && (
                  <p><strong>Teléfono:</strong> {order.phone}</p>
                )}
                {order.user_id && (
                  <p><strong>Usuario Registrado:</strong> Sí</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className={styles.section}>
            <h2>Productos del Pedido</h2>
            {orderItems.length > 0 ? (
              <div className={styles.orderItems}>
                {orderItems.map((item, index) => (
                  <div key={index} className={styles.orderItem}>
                    <div className={styles.itemInfo}>
                      <h4>{item.product_name || 'Producto'}</h4>
                      <p><strong>SKU:</strong> {item.product_sku || item.variant_sku || 'N/A'}</p>
                      {item.variant_name && (
                        <p><strong>Variante:</strong> {item.variant_name}</p>
                      )}
                      <p><strong>Cantidad:</strong> {item.quantity}</p>
                      <p><strong>Precio Unitario:</strong> {formatCurrency(item.unit_price)}</p>
                    </div>
                    <div className={styles.itemTotal}>
                      <strong>{formatCurrency(item.total_price)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No hay productos en este pedido</p>
            )}
          </div>

          {/* Financial Summary */}
          <div className={styles.section}>
            <h2>Resumen Financiero</h2>
            <div className={styles.financialSummary}>
              <div className={styles.financialRow}>
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className={styles.financialRow}>
                  <span>Impuestos:</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className={styles.financialRow}>
                  <span>Envío:</span>
                  <span>{formatCurrency(order.shipping_amount)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className={styles.financialRow}>
                  <span>Descuento:</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className={styles.financialRowTotal}>
                <span><strong>Total:</strong></span>
                <span><strong>{formatCurrency(order.total_amount)}</strong></span>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className={styles.section}>
            <h2>Información de Entrega</h2>
            <div className={styles.deliveryInfo}>
              {order.estimated_delivery_date && (
                <div className={styles.deliveryItem}>
                  <label>Fecha Estimada de Entrega:</label>
                  <span>{formatDate(order.estimated_delivery_date)}</span>
                </div>
              )}
              {order.actual_delivery_date && (
                <div className={styles.deliveryItem}>
                  <label>Fecha Real de Entrega:</label>
                  <span>{formatDate(order.actual_delivery_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className={styles.section}>
              <h2>Notas del Pedido</h2>
              <div className={styles.notes}>
                <p>{order.notes}</p>
              </div>
            </div>
          )}

          {/* Status Update */}
          <div className={styles.section}>
            <h2>Actualizar Estado</h2>
            <div className={styles.statusUpdate}>
              <select
                value={order.status_id}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                className={styles.statusSelect}
              >
                {orderStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
              {updating && <span className={styles.updating}>Actualizando...</span>}
            </div>
          </div>

          {/* Shipping info (optional): sent to shipping, tracking */}
          <div className={styles.section}>
            <h2>Información de envío (opcional)</h2>
            <p className={styles.sectionHint}>
              Añade número de guía, paquetería y enlace de rastreo cuando hayas enviado el pedido.
            </p>
            <div className={styles.shippingForm}>
              <div className={styles.shippingField}>
                <label htmlFor="tracking_id">Número de guía / Tracking ID</label>
                <input
                  id="tracking_id"
                  type="text"
                  value={shippingTrackingId}
                  onChange={(e) => setShippingTrackingId(e.target.value)}
                  placeholder="Ej: 1234567890"
                  className={styles.shippingInput}
                  disabled={updating}
                />
              </div>
              <div className={styles.shippingField}>
                <label htmlFor="carrier_company">Paquetería</label>
                <input
                  id="carrier_company"
                  type="text"
                  value={shippingCarrier}
                  onChange={(e) => setShippingCarrier(e.target.value)}
                  placeholder="Ej: DHL, FedEx, Estafeta"
                  className={styles.shippingInput}
                  disabled={updating}
                />
              </div>
              <div className={styles.shippingField}>
                <label htmlFor="tracking_url">URL de rastreo</label>
                <input
                  id="tracking_url"
                  type="url"
                  value={shippingUrl}
                  onChange={(e) => setShippingUrl(e.target.value)}
                  placeholder="https://..."
                  className={styles.shippingInput}
                  disabled={updating}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveShippingInfo}
                disabled={updating}
                className={styles.saveShippingButton}
              >
                {updating ? 'Guardando...' : 'Guardar información de envío'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
