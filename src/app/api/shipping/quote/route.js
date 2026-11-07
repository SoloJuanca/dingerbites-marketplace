import { NextResponse } from 'next/server';
import { getRequestMeta, jsonError } from '../../../../lib/security';
import { checkRateLimit } from '../../../../lib/rateLimit';
import {
  getEnviaOrigin,
  quoteShipments,
  getEnviaRateOptions
} from '../../../../lib/envia';
import { buildShippingPackagePlanForItems } from '../../../../lib/shippingPackageQuote';

export async function POST(request) {
  const requestMeta = getRequestMeta(request);
  try {
    const rateLimitResult = checkRateLimit({
      routeKey: 'shipping:quote',
      ip: requestMeta.ip,
      limit: 20,
      windowMs: 60 * 1000
    });
    if (!rateLimitResult.allowed) {
      return jsonError('Demasiadas cotizaciones. Intenta de nuevo más tarde.', 429, 'RATE_LIMITED', {
        retry_after_ms: rateLimitResult.retryAfterMs
      });
    }

    const { destination, items } = await request.json();
    if (!destination || typeof destination !== 'object') {
      return NextResponse.json({ error: 'La dirección de destino es requerida' }, { status: 400 });
    }
    const requiredFields = ['name', 'phone', 'street', 'number', 'district', 'city', 'state', 'postalCode'];
    if (
      requiredFields.some(
        (field) => typeof destination[field] !== 'string' || !destination[field].trim()
      )
    ) {
      return NextResponse.json({ error: 'Completa todos los campos de la dirección para cotizar.' }, { status: 400 });
    }
    if (requiredFields.some((field) => destination[field].length > 120)) {
      return NextResponse.json({ error: 'La dirección contiene campos demasiado largos.' }, { status: 400 });
    }

    const packagePlan = await buildShippingPackagePlanForItems(items);
    const quotes = await quoteShipments({
      origin: getEnviaOrigin(),
      destination,
      packages: packagePlan.packages
    });
    const options = getEnviaRateOptions({ data: quotes.rates });
    if (options.length === 0) {
      console.warn('Envia shipping quote returned no usable rates', {
        request_id: requestMeta.requestId || null,
        carriers: quotes.carrierResults
      });
      return NextResponse.json(
        { error: 'Envia no encontró servicios disponibles con las paqueterías configuradas. Esto no confirma que la dirección sea inválida; revisa el código postal, el origen y los transportistas habilitados en tu cuenta.' },
        { status: 502 }
      );
    }
    return NextResponse.json({ options, packageSummary: packagePlan.summary, currency: 'MXN' });
  } catch (error) {
    console.error('Envia shipping quote failed', {
      request_id: requestMeta?.requestId || null,
      code: error.code || 'SHIPPING_QUOTE_FAILED',
      api_host: error.apiHost || null,
      cause_code: error.causeCode || null,
      cause_name: error.causeName || null,
      status: error.status || null
    });
    const status = [
      'ENVIA_NOT_CONFIGURED',
      'ENVIA_ORIGIN_NOT_CONFIGURED',
      'ENVIA_CARRIER_NOT_CONFIGURED'
    ].includes(error.code)
      ? 503
      : [
          'SHIPPING_ITEMS_REQUIRED',
          'SHIPPING_ITEMS_INVALID',
          'SHIPPING_PRODUCT_NOT_FOUND'
        ].includes(error.code)
        ? 400
        : 502;
    return NextResponse.json({ error: error.message }, { status });
  }
}
