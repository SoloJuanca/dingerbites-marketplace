'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '../../../lib/CartContext';
import OrderConfirmation from '../../../components/OrderConfirmation/OrderConfirmation';
import styles from './success.module.css';

function StripeSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');
  const { clearCart } = useCart();
  const successToastShownRef = useRef(false);
  const [state, setState] = useState({
    loading: true,
    error: null,
    order: null,
    hint: ''
  });

  useEffect(() => {
    if (redirectStatus === 'failed') {
      setState({
        loading: false,
        error: 'redirect_failed',
        order: null,
        hint: ''
      });
      toast.error('El pago no se completó. Intenta de nuevo o usa otro método.');
      return;
    }

    if (!sessionId && !paymentIntentId) {
      setState({ loading: false, error: 'missing_session', order: null, hint: '' });
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 90;

    async function pollOnce() {
      if (sessionId) {
        const res = await fetch(
          `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' }
        );
        const data = await res.json().catch(() => ({}));
        return { res, data };
      }
      const res = await fetch(
        `/api/checkout/payment-status?payment_intent=${encodeURIComponent(paymentIntentId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => ({}));
      return { res, data };
    }

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        try {
          const { res, data } = await pollOnce();
          if (!res.ok) {
            setState({
              loading: false,
              error: 'api_error',
              order: null,
              hint: data.error || ''
            });
            toast.error(data.error || 'No se pudo verificar el pago');
            return;
          }

          if (data.order_ready && data.order) {
            clearCart();
            setState({ loading: false, error: null, order: data.order, hint: '' });
            if (!successToastShownRef.current) {
              successToastShownRef.current = true;
              toast.success('¡Pedido registrado correctamente!');
            }
            return;
          }

          if (data.fatal) {
            const errKey =
              data.reason === 'insufficient_stock' ? 'insufficient_stock' : 'payment_failed';
            setState({
              loading: false,
              error: errKey,
              order: null,
              hint: data.message || ''
            });
            toast.error(data.message || 'El pago no se completó');
            return;
          }

          if (data.keep_polling || (data.paid && data.order_ready === false)) {
            if (data.message) {
              setState((prev) => ({ ...prev, hint: data.message, loading: true }));
            }
            attempts += 1;
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          if (data.paid === false && !data.keep_polling) {
            setState({
              loading: false,
              error: 'not_paid',
              order: null,
              hint: data.message || ''
            });
            toast.error(data.message || 'El pago no se completó');
            return;
          }
        } catch {
          setState({ loading: false, error: 'network', order: null, hint: '' });
          toast.error('Error de conexión al verificar el pago');
          return;
        }
        attempts += 1;
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) {
        setState({
          loading: false,
          error: 'timeout',
          order: null,
          hint: ''
        });
        toast.error('Seguimos procesando tu pago. Revisa tu correo o el historial de pedidos.');
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, paymentIntentId, redirectStatus, clearCart]);

  if (state.loading) {
    return (
      <div className={styles.stateWrap}>
        <p className={styles.stateTitle}>Confirmando tu pago…</p>
        {state.hint ? (
          <p className={styles.stateText}>{state.hint}</p>
        ) : (
          <p className={styles.stateText}>Esto solo toma unos segundos.</p>
        )}
      </div>
    );
  }

  if (state.error === 'missing_session') {
    return (
      <div className={styles.stateWrap}>
        <p className={styles.stateTitle}>Enlace no válido</p>
        <p className={styles.stateText}>Vuelve al checkout para intentar de nuevo.</p>
        <Link href="/checkout" className={styles.link}>
          Ir al checkout
        </Link>
      </div>
    );
  }

  if (state.error === 'insufficient_stock') {
    return (
      <div className={styles.stateWrap}>
        <p className={styles.stateTitle}>Sin stock disponible</p>
        {state.hint && <p className={styles.stateText}>{state.hint}</p>}
        <p className={styles.stateText}>
          Si el pago ya se cargó, contacta a soporte para revisar tu caso o reembolso.
        </p>
        <Link href="/checkout" className={styles.link}>
          Volver al checkout
        </Link>
      </div>
    );
  }

  if (state.error === 'redirect_failed' || state.error === 'payment_failed') {
    return (
      <div className={styles.stateWrap}>
        <p className={styles.stateTitle}>No se completó el pago</p>
        {state.hint && <p className={styles.stateText}>{state.hint}</p>}
        <Link href="/checkout" className={styles.link}>
          Volver al checkout
        </Link>
      </div>
    );
  }

  if (state.error === 'not_paid') {
    return (
      <div className={styles.stateWrap}>
        <p className={styles.stateTitle}>Pago no confirmado</p>
        {state.hint && <p className={styles.stateText}>{state.hint}</p>}
        <Link href="/checkout" className={styles.link}>
          Intentar de nuevo
        </Link>
      </div>
    );
  }

  if (state.error === 'timeout') {
    return (
      <div className={styles.stateWrap}>
        <p className={styles.stateTitle}>Seguimos procesando</p>
        <p className={styles.stateText}>
          Si el cargo apareció en tu banco o método de pago, tu pedido puede tardar unos minutos en
          aparecer. Revisa tu correo o &quot;Mis órdenes&quot;.
        </p>
        <Link href="/profile" className={styles.link}>
          Ir a mi perfil
        </Link>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={styles.stateWrap}>
        <p className={styles.stateTitle}>No se pudo confirmar el pedido</p>
        {state.hint && <p className={styles.stateText}>{state.hint}</p>}
        <Link href="/checkout" className={styles.link}>
          Volver al checkout
        </Link>
      </div>
    );
  }

  if (state.order) {
    const o = state.order;
    const displayName =
      o.customer_name && String(o.customer_name).trim()
        ? o.customer_name
        : o.customer_email?.split('@')[0] || 'Cliente';

    return (
      <OrderConfirmation
        orderNumber={o.order_number}
        customerName={displayName}
        customerEmail={o.customer_email || ''}
        customerPhone={o.customer_phone || ''}
        total={o.total_amount}
        deliveryType={o.delivery_type}
        pickupPoint={o.pickup_point}
        paymentMethod="stripe"
        estimatedDelivery={o.delivery_type === 'delivery' ? '1-2 días hábiles' : 'Disponible para recoger'}
      />
    );
  }

  return null;
}

export default function CheckoutSuccessPage() {
  return (
    <div className={styles.page}>
      <Suspense
        fallback={
          <div className={styles.stateWrap}>
            <p className={styles.stateTitle}>Cargando…</p>
          </div>
        }
      >
        <StripeSuccessContent />
      </Suspense>
    </div>
  );
}
