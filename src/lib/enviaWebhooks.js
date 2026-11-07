import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.ENVIA_WEBHOOK_SECRET || '';
const WEBHOOK_AUTH_TOKEN = process.env.ENVIA_WEBHOOK_AUTH_TOKEN || '';

const SIGNED_EVENT_TYPES = new Set([
  'tracking.simple',
  'simpleTracking',
  'ecommerceTracking',
  'surcharge'
]);

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function mapEnviaStatusToInternal(status) {
  const value = String(status || '').toLowerCase().trim();
  if (!value) return 'in_transit';

  if (value.includes('deliver')) return 'delivered';
  if (value.includes('cancel')) return 'canceled';
  if (value.includes('fail') || value.includes('exception') || value.includes('return')) return 'failed';
  if (value.includes('pick') || value === 'shipped') return 'picked_up';
  if (value.includes('transit') || value.includes('route') || value.includes('hub')) return 'in_transit';

  return 'in_transit';
}

function buildEventKey({ headers, body, trackingNumber, status, eventType }) {
  const webhookId = headers.get('x-webhook-id');
  if (webhookId) return String(webhookId);

  const createdAt = body?.created_at || body?.data?.created_at || Date.now();
  const hash = crypto
    .createHash('sha256')
    .update(`${eventType}:${trackingNumber}:${status}:${createdAt}`)
    .digest('hex')
    .slice(0, 32);
  return hash;
}

function extractTrackingNumber(data = {}) {
  return (
    data.tracking_number
    || data.trackingNumber
    || data.tracking_id
    || data.trackingId
    || null
  );
}

function extractShipmentId(data = {}) {
  return data.shipment_id || data.shipmentId || data.id || null;
}

function extractOrderReference(data = {}) {
  return (
    data.order_reference
    || data.orderReference
    || data.reference
    || data.ecommerce_order_id
    || data.ecommerceOrderId
    || null
  );
}

function normalizeSurcharge(data = {}) {
  const surcharge = data.surcharge_data || data.surchargeData || data;
  if (!surcharge || typeof surcharge !== 'object') return null;

  return {
    type: surcharge.surcharge_type || surcharge.type || 'unknown',
    reason: surcharge.reason || '',
    amount: Number(surcharge.amount) || 0,
    currency: surcharge.currency || 'MXN',
    transactionType: surcharge.transaction_type || surcharge.transactionType || 'surcharge'
  };
}

export function normalizeEnviaEvent(body, headers) {
  const headerEvent = headers.get('x-webhook-event') || '';
  const payloadType = String(body?.type || body?.event || headerEvent || '').trim();
  const data = body?.data && typeof body.data === 'object' ? body.data : body;

  const eventType = payloadType
    || (data?.surcharge_data || data?.surchargeData ? 'surcharge' : 'onShipmentStatusUpdate');

  const trackingNumber = extractTrackingNumber(data);
  const shipmentId = extractShipmentId(data);
  const carrier = data.carrier_name || data.carrier || data.carrierName || null;
  const rawStatus = data.status || data.status_name || data.statusName || data.event || '';
  const status = eventType === 'surcharge'
    ? 'surcharge'
    : mapEnviaStatusToInternal(rawStatus);

  const eventKey = buildEventKey({
    headers,
    body,
    trackingNumber,
    status,
    eventType
  });

  return {
    eventKey,
    eventType,
    trackingNumber: trackingNumber ? String(trackingNumber) : null,
    shipmentId: shipmentId != null ? String(shipmentId) : null,
    carrier: carrier ? String(carrier) : null,
    status,
    rawStatus: rawStatus ? String(rawStatus) : null,
    statusDescription: data.status_description || data.statusDescription || data.description || null,
    location: data.location || null,
    orderReference: extractOrderReference(data) ? String(extractOrderReference(data)) : null,
    trackingUrl: data.tracking_url || data.trackingUrl || null,
    surcharge: eventType === 'surcharge' ? normalizeSurcharge(data) : null,
    raw: body
  };
}

function verifySignedWebhook(request, rawBody) {
  if (!WEBHOOK_SECRET) {
    return { valid: false, error: 'ENVIA_WEBHOOK_SECRET not configured' };
  }

  const signature = request.headers.get('x-webhook-signature') || '';
  const timestamp = request.headers.get('x-webhook-timestamp') || '';
  const event = request.headers.get('x-webhook-event') || '';

  if (!signature || !timestamp || !event) {
    return { valid: false, error: 'Missing signed webhook headers' };
  }

  const payload = `${timestamp}.${event}.${rawBody}`;
  const expected = `v1=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex')}`;

  if (!timingSafeEqual(signature, expected)) {
    return { valid: false, error: 'Invalid webhook signature' };
  }

  return { valid: true };
}

function verifyLegacyWebhook(request) {
  if (!WEBHOOK_AUTH_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, error: 'ENVIA_WEBHOOK_AUTH_TOKEN not configured' };
    }
    console.warn('Envia legacy webhook accepted without auth token (dev only)');
    return { valid: true, legacy: true };
  }

  const auth = request.headers.get('authorization') || '';
  const expected = `Bearer ${WEBHOOK_AUTH_TOKEN}`;
  if (auth !== expected) {
    return { valid: false, error: 'Invalid webhook authorization' };
  }

  return { valid: true, legacy: true };
}

export function verifyEnviaWebhook(request, rawBody, parsedBody = null) {
  const body = parsedBody || (rawBody ? JSON.parse(rawBody) : {});
  const headerEvent = request.headers.get('x-webhook-event') || '';
  const payloadType = String(body?.type || body?.event || headerEvent || '');
  const isSigned = Boolean(request.headers.get('x-webhook-signature'))
    || SIGNED_EVENT_TYPES.has(payloadType);

  if (isSigned) {
    return verifySignedWebhook(request, rawBody);
  }

  return verifyLegacyWebhook(request);
}

export function shouldNotifyCustomer(status, lastNotifiedStatus) {
  if (!status || status === 'surcharge') return false;
  if (status === lastNotifiedStatus) return false;

  return ['picked_up', 'in_transit', 'delivered', 'canceled', 'failed'].includes(status);
}

export function buildTrackingUrl({ carrier, trackingNumber, trackingUrl }) {
  if (trackingUrl) return trackingUrl;
  if (!trackingNumber) return null;

  const carrierName = String(carrier || '').toLowerCase();
  if (carrierName.includes('estafeta')) {
    return `https://www.estafeta.com/Herramientas/Rastreo?guia=${encodeURIComponent(trackingNumber)}`;
  }
  if (carrierName.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  }
  if (carrierName.includes('dhl')) {
    return `https://www.dhl.com/mx-es/home/tracking.html?tracking-id=${encodeURIComponent(trackingNumber)}`;
  }

  return null;
}
