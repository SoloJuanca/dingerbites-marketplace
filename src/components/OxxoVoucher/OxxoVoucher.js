'use client';

import styles from './OxxoVoucher.module.css';

export default function OxxoVoucher({
  orderNumber,
  totalAmount,
  hostedVoucherUrl,
  referenceNumber,
  expiresAt,
  voucherPageUrl = null,
  isPaid = false
}) {
  const formatPrice = (price) => {
    if (price == null) return '—';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const formatExpires = (iso) => {
    if (!iso) return 'Consulta tu ficha';
    return new Date(iso).toLocaleString('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short'
    });
  };

  if (!hostedVoucherUrl && !referenceNumber) {
    return null;
  }

  return (
    <section className={styles.wrap} aria-label="Ficha de pago OXXO">
      <h2 className={styles.title}>Pago en OXXO</h2>
      <p className={styles.subtitle}>
        {isPaid
          ? 'Este pedido ya fue pagado en OXXO.'
          : 'Presenta esta ficha en cualquier tienda OXXO y paga en efectivo antes de la fecha límite.'}
      </p>

      <div className={styles.meta}>
        {orderNumber && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Pedido</span>
            <span className={styles.metaValue}>{orderNumber}</span>
          </div>
        )}
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Total</span>
          <span className={styles.metaValue}>{formatPrice(totalAmount)}</span>
        </div>
        {referenceNumber && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Referencia</span>
            <span className={styles.metaValue}>{referenceNumber}</span>
          </div>
        )}
        {!isPaid && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Válido hasta</span>
            <span className={styles.metaValue}>{formatExpires(expiresAt)}</span>
          </div>
        )}
      </div>

      {!isPaid && hostedVoucherUrl && (
        <div className={styles.barcodeWrap}>
          <img
            src={hostedVoucherUrl}
            alt="Código de barras para pago en OXXO"
            className={styles.barcodeImg}
          />
        </div>
      )}

      {!isPaid && voucherPageUrl && (
        <p style={{ textAlign: 'center' }}>
          <a href={voucherPageUrl} className={styles.linkButton} target="_blank" rel="noopener noreferrer">
            Abrir ficha completa
          </a>
        </p>
      )}

      {!isPaid && (
        <p className={styles.hint}>
          El inventario de tu pedido está reservado hasta que pagues o venza la ficha. Te avisaremos por
          correo cuando Stripe confirme el pago.
        </p>
      )}

      {isPaid && <p className={styles.paidBanner}>Pago OXXO confirmado</p>}
    </section>
  );
}
