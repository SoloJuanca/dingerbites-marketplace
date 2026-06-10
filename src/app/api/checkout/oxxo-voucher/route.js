import { NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '../../../../lib/stripeServer';
import {
  extractOxxoDetailsFromPaymentIntent,
  findOrderByPaymentIntentId
} from '../../../../lib/oxxoOrders';
import { jsonError } from '../../../../lib/security';

export const runtime = 'nodejs';

/**
 * GET /api/checkout/oxxo-voucher?payment_intent=pi_...
 * Public read of OXXO voucher tied to a PaymentIntent (unguessable id).
 */
export async function GET(request) {
  try {
    const piId = request.nextUrl.searchParams.get('payment_intent');
    if (!piId || !piId.startsWith('pi_')) {
      return jsonError('payment_intent inválido', 400, 'INVALID_PAYMENT_INTENT');
    }

    if (!isStripeConfigured()) {
      return jsonError('Stripe no está configurado', 503, 'STRIPE_NOT_CONFIGURED');
    }

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(piId);
    const oxxoFromPi = extractOxxoDetailsFromPaymentIntent(pi);

    const order = await findOrderByPaymentIntentId(piId);

    const hostedVoucherUrl =
      order?.oxxo_hosted_voucher_url || oxxoFromPi?.oxxo_hosted_voucher_url || null;
    const referenceNumber =
      order?.oxxo_reference_number || oxxoFromPi?.oxxo_reference_number || null;
    const expiresAt = order?.oxxo_expires_at || oxxoFromPi?.oxxo_expires_at || null;

    if (!hostedVoucherUrl && pi.status !== 'succeeded') {
      return jsonError('Voucher OXXO no disponible', 404, 'VOUCHER_NOT_FOUND');
    }

    return NextResponse.json({
      payment_intent_status: pi.status,
      order_id: order?.id || null,
      order_number: order?.order_number || null,
      total_amount: order?.total_amount ?? (pi.amount ? pi.amount / 100 : null),
      payment_status: order?.payment_status || null,
      oxxo_hosted_voucher_url: hostedVoucherUrl,
      oxxo_reference_number: referenceNumber,
      oxxo_expires_at: expiresAt,
      paid: order?.payment_status === 'paid' || pi.status === 'succeeded'
    });
  } catch (error) {
    console.error('oxxo-voucher error:', error);
    return jsonError(error?.message || 'No se pudo cargar el voucher', 500, 'OXXO_VOUCHER_ERROR');
  }
}
