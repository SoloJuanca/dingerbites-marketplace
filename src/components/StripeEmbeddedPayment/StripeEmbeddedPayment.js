'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import styles from './StripeEmbeddedPayment.module.css';

function stripeErrorToMessage(error) {
  if (!error) return 'No se pudo completar el pago. Intenta de nuevo.';
  const code = error.code || '';
  const type = error.type || '';

  if (type === 'card_error' || type === 'validation_error') {
    return error.message || 'Revisa los datos e intenta de nuevo.';
  }
  if (code === 'payment_intent_authentication_failure') {
    return 'La autenticación del pago falló. Prueba con otro método o tarjeta.';
  }
  if (type === 'invalid_request_error') {
    return error.message || 'Solicitud inválida. Actualiza la página e intenta de nuevo.';
  }
  return error.message || 'No se pudo completar el pago. Intenta de nuevo.';
}

function PaymentForm({ returnPath }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const successUrl = `${origin}${returnPath}`;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: successUrl
      },
      redirect: 'if_required'
    });

    if (error) {
      const msg = stripeErrorToMessage(error);
      setMessage(msg);
      toast.error(msg);
      setBusy(false);
      return;
    }

    if (paymentIntent) {
      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        toast.success(
          paymentIntent.status === 'processing'
            ? 'Pago en proceso. Te llevamos a confirmar tu pedido…'
            : 'Pago recibido. Confirmando tu pedido…'
        );
        const url = new URL(successUrl, origin);
        url.searchParams.set('payment_intent', paymentIntent.id);
        // replace: evita que "Atrás" vuelva al checkout con el carrito ya vaciado tras confirmar en /success
        window.location.replace(url.toString());
        return;
      }
    }

    setBusy(false);
    const fallback = 'No se obtuvo confirmación del pago. Revisa tu correo o intenta de nuevo.';
    setMessage(fallback);
    toast.error(fallback);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.elementWrap}>
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto'
            }
          }}
        />
      </div>
      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
      <button type="submit" className={styles.payButton} disabled={!stripe || busy}>
        {busy ? 'Procesando…' : 'Pagar ahora'}
      </button>
    </form>
  );
}

export default function StripeEmbeddedPayment({
  clientSecret,
  publishableKey,
  returnPath = '/checkout/success'
}) {
  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  if (!clientSecret || !publishableKey || !stripePromise) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0f172a',
        borderRadius: '8px',
        spacingUnit: '8px'
      }
    },
    locale: 'es-MX'
  };

  return (
    <div className={styles.wrap}>
      <Elements stripe={stripePromise} options={options}>
        <PaymentForm returnPath={returnPath} />
      </Elements>
    </div>
  );
}
