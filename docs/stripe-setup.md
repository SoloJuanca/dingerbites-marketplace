# Stripe (checkout)

## Variables de entorno

Copia los valores en `.env` o `.env.local` (ver también [.env-template](../.env-template)):

| Variable | Uso |
| -------- | --- |
| `STRIPE_SECRET_KEY` | Clave secreta (`sk_test_…` / `sk_live_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publicable (`pk_test_…` / `pk_live_…`) para el formulario de tarjeta en el sitio |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma del webhook (`whsec_…`) |
| `NEXT_PUBLIC_APP_URL` | URL pública del sitio **sin** barra final, para `success_url` y `cancel_url` (ej. `https://tudominio.com`). En local: `http://localhost:3000`. Si no está definida, se usa `NEXT_PUBLIC_BASE_URL`. |

## Webhook en desarrollo local

1. Instala la [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Inicia el forward de eventos hacia tu app:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Copia el **signing secret** que imprime la CLI (`whsec_…`) y asígnalo a `STRIPE_WEBHOOK_SECRET` mientras desarrollas.

4. En el Dashboard de Stripe, el endpoint de producción debe apuntar a `https://tu-dominio/api/webhooks/stripe` y usar el signing secret de ese endpoint.

5. En **Seleccionar eventos**, incluye al menos **`payment_intent.succeeded`** (pago embebido con Payment Element). Si aún usas Checkout alojado en otro entorno, puedes mantener también `checkout.session.completed`.

## Métodos de pago (Google Pay, Apple Pay, OXXO, etc.)

En **Stripe Dashboard → Configuración → Métodos de pago**, activa los que quieras ofrecer (tarjetas, **Link**, **OXXO**, billeteras, etc.). El **Payment Element** del checkout muestra automáticamente los compatibles con **MXN** y tu cuenta.

- **Apple Pay**: suele requerir verificar el dominio en Stripe (Web domains).
- **Google Pay**: habilitar en el Dashboard y cumplir requisitos de negocio/región.
- **OXXO**: activar el método para México; el pago puede quedar en **processing** hasta que se liquide el voucher.

## Pago de prueba

En modo test, usa por ejemplo la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y CVC de 3 dígitos.
