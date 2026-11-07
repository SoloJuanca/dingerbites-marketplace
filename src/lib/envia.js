const ENVIA_API_URL = process.env.ENVIA_API_URL || 'https://api.envia.com';
const ENVIA_API_KEY = process.env.ENVIA_API_KEY || '';
const ENVIA_SHIPPING_CARRIERS = process.env.ENVIA_SHIPPING_CARRIERS || process.env.ENVIA_SHIPPING_CARRIER || '';

const MEXICAN_STATE_CODES = {
  'aguascalientes': 'AG',
  'baja california': 'BC',
  'baja california sur': 'BS',
  'campeche': 'CM',
  'chiapas': 'CS',
  'chihuahua': 'CH',
  'ciudad de mexico': 'DF',
  'estado de mexico': 'EM',
  'coahuila': 'CO',
  'colima': 'CL',
  'durango': 'DG',
  'guanajuato': 'GT',
  'guerrero': 'GR',
  'hidalgo': 'HG',
  'jalisco': 'JA',
  'mexico': 'EM',
  'michoacan': 'MI',
  'morelos': 'MO',
  'nayarit': 'NA',
  'nuevo leon': 'NL',
  'oaxaca': 'OA',
  'puebla': 'PU',
  'queretaro': 'QT',
  'quintana roo': 'QR',
  'san luis potosi': 'SL',
  'sinaloa': 'SI',
  'sonora': 'SO',
  'tabasco': 'TB',
  'tamaulipas': 'TM',
  'tlaxcala': 'TL',
  'veracruz': 'VE',
  'yucatan': 'YU',
  'zacatecas': 'ZA'
};

export function getEnviaOrigin() {
  const origin = {
    name: process.env.ENVIA_ORIGIN_NAME || 'Dingerbites',
    company: process.env.ENVIA_ORIGIN_COMPANY || 'Dingerbites',
    phone: process.env.ENVIA_ORIGIN_PHONE || '',
    street: process.env.ENVIA_ORIGIN_STREET || '',
    number: process.env.ENVIA_ORIGIN_NUMBER || '',
    district: process.env.ENVIA_ORIGIN_DISTRICT || '',
    city: process.env.ENVIA_ORIGIN_CITY || '',
    state: process.env.ENVIA_ORIGIN_STATE || '',
    country: process.env.ENVIA_ORIGIN_COUNTRY || 'MX',
    postalCode: process.env.ENVIA_ORIGIN_POSTAL_CODE || ''
  };
  const requiredFields = ['street', 'number', 'district', 'city', 'state', 'postalCode'];
  const missingFields = requiredFields.filter((field) => !origin[field]);

  if (missingFields.length > 0) {
    const error = new Error(`Falta configurar el origen de envío de Envia: ${missingFields.join(', ')}`);
    error.code = 'ENVIA_ORIGIN_NOT_CONFIGURED';
    throw error;
  }

  return origin;
}

export function getEnviaCarriers(configuredCarriers = ENVIA_SHIPPING_CARRIERS) {
  const carriers = [...new Set(
    configuredCarriers.split(',').map((carrier) => carrier.trim().toLowerCase()).filter(Boolean)
  )];
  if (carriers.length === 0) {
    const error = new Error('Configura ENVIA_SHIPPING_CARRIERS con transportistas habilitados en tu cuenta de Envia.');
    error.code = 'ENVIA_CARRIER_NOT_CONFIGURED';
    throw error;
  }
  return carriers;
}

function normalizeAddress(addr) {
  const state = String(addr.state || '').trim();
  const normalizedState =
    state.length <= 3
      ? state.toUpperCase()
      : MEXICAN_STATE_CODES[
          state.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        ] || state;

  return {
    name: addr.name || '',
    company: addr.company || '',
    email: addr.email || '',
    phone: addr.phone || '',
    street: addr.street || addr.line1 || '',
    number: addr.number || addr.street_number || '',
    district: addr.district || addr.neighborhood || '',
    city: addr.city || '',
    state: normalizedState,
    country: addr.country || 'MX',
    postalCode: addr.postal_code || addr.postalCode || ''
  };
}

export async function quoteShipment({ origin, destination, packages, carrier }) {
  if (!ENVIA_API_KEY) {
    const error = new Error('Envia no está configurado. Agrega ENVIA_API_KEY para obtener una cotización real.');
    error.code = 'ENVIA_NOT_CONFIGURED';
    throw error;
  }
  if (!carrier) {
    const error = new Error('Se requiere un transportista para consultar las tarifas de Envia.');
    error.code = 'ENVIA_CARRIER_NOT_CONFIGURED';
    throw error;
  }
  const apiHost = new URL(ENVIA_API_URL).host;
  let res;
  try {
    res = await fetch(`${ENVIA_API_URL}/ship/rate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENVIA_API_KEY}` },
      body: JSON.stringify({
        origin: normalizeAddress(origin),
        destination: normalizeAddress(destination),
        packages: packages || [{ weight: 0.1, length: 15, width: 10, height: 2, content: 'TCG cards' }],
        settings: { currency: 'MXN' },
        shipment: { type: 1, carrier }
      })
    });
  } catch (error) {
    const connectionError = new Error(
      `No se pudo conectar con Envia en ${apiHost}. Verifica la conexión y la URL de la API.`
    );
    connectionError.code = 'ENVIA_QUOTE_FAILED';
    connectionError.apiHost = apiHost;
    connectionError.causeCode = error.cause?.code || error.code || null;
    connectionError.causeName = error.cause?.name || error.name || null;
    throw connectionError;
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    const responseText = await res.text();
    let detail = '';
    if (contentType.includes('application/json')) {
      try {
        const responseBody = JSON.parse(responseText);
        detail = responseBody.message || responseBody.error || '';
      } catch {
        detail = '';
      }
    }
    let message = detail || `Envia respondió con el estado HTTP ${res.status}.`;
    if (res.status === 401) {
      message = `Envia rechazó la autenticación (HTTP 401) en ${apiHost}. Verifica que el token pertenezca al entorno de esta URL.`;
    } else if (res.status === 403 && !contentType.includes('application/json')) {
      message = `El host ${apiHost} respondió HTTP 403 con una página HTML, no con la API de cotizaciones. Confirma con Envia la URL y ruta de API habilitadas para tu cuenta.`;
    } else if (res.status === 403) {
      message = `Envia denegó la solicitud (HTTP 403) en ${apiHost}. Verifica los permisos de la cuenta y del transportista.`;
    } else if (!detail && !contentType.includes('application/json')) {
      message = `Envia respondió HTTP ${res.status} con contenido no JSON desde ${apiHost}. Confirma la URL y ruta de API.`;
    }
    const error = new Error(message);
    error.code = 'ENVIA_QUOTE_FAILED';
    error.status = res.status;
    error.apiHost = apiHost;
    throw error;
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const error = new Error(`Envia devolvió una respuesta no JSON desde ${ENVIA_API_URL}. Verifica la URL configurada.`);
    error.code = 'ENVIA_INVALID_RESPONSE';
    throw error;
  }
  return res.json();
}

export async function quoteShipments({ origin, destination, packages }) {
  const carriers = getEnviaCarriers();
  const results = await Promise.allSettled(
    carriers.map(async (carrier) => {
      const quote = await quoteShipment({ origin, destination, packages, carrier });
      const rates = Array.isArray(quote.data) ? quote.data : Array.isArray(quote.quotes) ? quote.quotes : [];
      return {
        carrier,
        rateCount: rates.length,
        rates: rates.map((rate) => ({
          ...rate,
          carrier: rate.carrier || carrier,
          carrierCode: rate.carrierCode || rate.carrier_code || carrier
        }))
      };
    })
  );
  const carrierResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { carrier: result.value.carrier, rate_count: result.value.rateCount };
    }
    return {
      carrier: carriers[index],
      rate_count: 0,
      status: result.reason.status || null,
      code: result.reason.code || 'ENVIA_QUOTE_FAILED',
      api_host: result.reason.apiHost || null
    };
  });
  const rates = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value.rates);

  return { rates, carrierResults };
}

function getRateLabel(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.name || value.description || value.code || value.id || '').trim();
}

export function getEnviaRateOptions(quote) {
  const rates = Array.isArray(quote?.data) ? quote.data : Array.isArray(quote?.quotes) ? quote.quotes : [];
  const optionsById = new Map();

  for (const rate of rates) {
    if (!rate || typeof rate !== 'object') continue;
    const carrier =
      getRateLabel(rate.carrierName || rate.carrier_name || rate.carrierDescription || rate.carrier_description || rate.carrier) ||
      getRateLabel(rate.carrierCode || rate.carrier_code);
    const service =
      getRateLabel(rate.serviceName || rate.service_name || rate.serviceDescription || rate.service_description || rate.service) ||
      getRateLabel(rate.serviceCode || rate.service_code);
    const carrierId = getRateLabel(rate.carrierCode || rate.carrier_code || rate.carrierId || rate.carrier_id || rate.carrier) || carrier;
    const serviceId = getRateLabel(rate.serviceCode || rate.service_code || rate.serviceId || rate.service_id || rate.service) || service;
    const rawPrice = rate.totalPrice ?? rate.price;
    const price = rawPrice === '' || rawPrice === null || rawPrice === undefined ? NaN : Number(rawPrice);
    const rawDeliveryDays = Number(rate.deliveryDays ?? rate.delivery_days ?? rate.estimatedDays ?? rate.estimated_days);
    const deliveryDays = Number.isFinite(rawDeliveryDays) && rawDeliveryDays > 0 ? rawDeliveryDays : null;

    if (!carrier || !service || !Number.isFinite(price) || price < 0) continue;

    const id = encodeURIComponent(JSON.stringify([carrierId, serviceId]));
    const option = {
      id,
      carrier,
      service,
      price,
      deliveryDays,
      estimatedDelivery:
        getRateLabel(rate.deliveryEstimate || rate.delivery_estimate || rate.deliveryDate || rate.delivery_date) ||
        (deliveryDays ? `${deliveryDays} días hábiles` : '')
    };
    const existing = optionsById.get(id);
    if (!existing || option.price < existing.price) optionsById.set(id, option);
  }

  return [...optionsById.values()].sort((a, b) => a.price - b.price);
}

export function defaultTcgPackage({ sealed = false } = {}) {
  const isSealed = sealed === true;
  return [{
    type: 'box',
    content: isSealed ? 'TCG sealed product' : 'TCG cards',
    amount: 1,
    declaredValue: 0,
    lengthUnit: 'CM',
    weightUnit: 'KG',
    weight: isSealed ? 0.3 : 0.05,
    dimensions: isSealed
      ? { length: 20, width: 15, height: 5 }
      : { length: 15, width: 10, height: 1 }
  }];
}
