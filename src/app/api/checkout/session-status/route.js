import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebaseAdmin';
import { getStripe, isStripeConfigured } from '../../../../lib/stripeServer';

export const runtime = 'nodejs';

function shippingMethodToDeliveryType(shippingMethod) {
  if (shippingMethod === 'Envío a domicilio') return 'delivery';
  if (shippingMethod === 'Recoger en punto') return 'pickup';
  return 'delivery';
}

/**
 * GET /api/checkout/session-status?session_id=cs_...
 * Used after Stripe redirect to poll until the webhook has created the order.
 */
export async function GET(request) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return NextResponse.json({ error: 'session_id inválido' }, { status: 400 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 503 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        paid: false,
        payment_status: session.payment_status
      });
    }

    const ordersSnap = await db
      .collection('orders')
      .where('stripe_checkout_session_id', '==', sessionId)
      .limit(1)
      .get();

    if (ordersSnap.empty) {
      return NextResponse.json({
        paid: true,
        order_ready: false,
        keep_polling: true,
        message: 'Registrando tu pedido…'
      });
    }

    const order = ordersSnap.docs[0].data();
    const shippingMethod = order.shipping_method || '';
    const deliveryType = shippingMethodToDeliveryType(shippingMethod);

    return NextResponse.json({
      paid: true,
      order_ready: true,
      order: {
        order_number: order.order_number,
        total_amount: order.total_amount,
        customer_email: order.customer_email,
        customer_name: order.customer_name || null,
        payment_method: 'stripe',
        delivery_type: deliveryType,
        pickup_point: order.pickup_point || null,
        shipping_method: shippingMethod
      }
    });
  } catch (error) {
    console.error('session-status error:', error);
    return NextResponse.json(
      { error: error?.message || 'No se pudo verificar la sesión' },
      { status: 500 }
    );
  }
}
