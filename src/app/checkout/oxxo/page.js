'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '../../../lib/CartContext';
import Header from '../../../components/Header/Header';
import Footer from '../../../components/Footer/Footer';
import OxxoVoucher from '../../../components/OxxoVoucher/OxxoVoucher';
import styles from './oxxo.module.css';

function OxxoCheckoutContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const { clearCart } = useCart();
  const [state, setState] = useState({ loading: true, error: null, voucher: null, paid: false });

  useEffect(() => {
    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      setState({ loading: false, error: 'missing_pi', voucher: null, paid: false });
      return;
    }

    let cancelled = false;
    let pollTimer = null;

    async function loadVoucher() {
      const res = await fetch(
        `/api/checkout/oxxo-voucher?payment_intent=${encodeURIComponent(paymentIntentId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;

      if (!res.ok) {
        setState({ loading: false, error: data.error || 'api_error', voucher: null, paid: false });
        return;
      }

      if (data.paid) {
        clearCart();
        setState({ loading: false, error: null, voucher: data, paid: true });
        return;
      }

      setState({ loading: false, error: null, voucher: data, paid: false });
      clearCart();
    }

    async function pollPaymentStatus() {
      const res = await fetch(
        `/api/checkout/payment-status?payment_intent=${encodeURIComponent(paymentIntentId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;

      if (data.paid && !data.awaiting_payment) {
        setState({
          loading: false,
          error: null,
          voucher: {
            ...data.order,
            oxxo_hosted_voucher_url: data.order?.oxxo_hosted_voucher_url,
            oxxo_reference_number: data.order?.oxxo_reference_number,
            oxxo_expires_at: data.order?.oxxo_expires_at,
            total_amount: data.order?.total_amount
          },
          paid: true
        });
        toast.success('¡Pago OXXO confirmado!');
        return;
      }

      if (data.fatal) {
        setState({ loading: false, error: 'payment_failed', voucher: null, paid: false });
        toast.error(data.message || 'El pago no se completó');
      }
    }

    loadVoucher();
    pollTimer = setInterval(pollPaymentStatus, 10000);
    pollPaymentStatus();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [paymentIntentId, clearCart]);

  if (state.loading) {
    return (
      <div className={styles.stateWrap}>
        <p>Cargando tu ficha OXXO…</p>
      </div>
    );
  }

  if (state.error === 'missing_pi') {
    return (
      <div className={styles.stateWrap}>
        <p>Enlace no válido.</p>
        <Link href="/checkout" className={styles.link}>
          Volver al checkout
        </Link>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={styles.stateWrap}>
        <p>No se pudo cargar la ficha de pago.</p>
        <Link href="/checkout" className={styles.link}>
          Volver al checkout
        </Link>
      </div>
    );
  }

  const v = state.voucher;

  return (
    <>
      <div className={styles.header}>
        <h1>{state.paid ? 'Pago recibido' : 'Paga en OXXO'}</h1>
        <p>
          {state.paid
            ? 'Tu pedido fue confirmado. Revisa tu correo para más detalles.'
            : 'Imprime o muestra esta ficha en cualquier OXXO.'}
        </p>
      </div>

      <OxxoVoucher
        orderNumber={v?.order_number}
        totalAmount={v?.total_amount}
        hostedVoucherUrl={v?.oxxo_hosted_voucher_url}
        referenceNumber={v?.oxxo_reference_number}
        expiresAt={v?.oxxo_expires_at}
        isPaid={state.paid}
      />

      {state.paid && v?.order_id && (
        <div className={styles.successBox}>
          <p>Pedido registrado correctamente.</p>
          <Link href={`/orders/${v.order_id}`} className={styles.link}>
            Ver mi pedido
          </Link>
        </div>
      )}

      {!state.paid && (
        <p className={styles.hint}>
          Esta página se actualizará cuando recibamos tu pago (puede tardar hasta el siguiente día hábil).
        </p>
      )}
    </>
  );
}

export default function OxxoCheckoutPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <Suspense fallback={<div className={styles.stateWrap}>Cargando…</div>}>
            <OxxoCheckoutContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
