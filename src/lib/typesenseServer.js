import Typesense from 'typesense';

let cachedClient = null;

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  return String(value || '').toLowerCase() === 'true';
}

export function getTypesenseConfig() {
  const host = process.env.TYPESENSE_HOST;
  const port = process.env.TYPESENSE_PORT || '443';
  const protocol = process.env.TYPESENSE_PROTOCOL || 'https';
  const apiKey = process.env.TYPESENSE_ADMIN_API_KEY;
  const collectionName = process.env.TYPESENSE_COLLECTION_PRODUCTS || 'products_v1';
  const enableSearch = toBoolean(process.env.TYPESENSE_ENABLE_SEARCH ?? 'true');

  return {
    host,
    port,
    protocol,
    apiKey,
    collectionName,
    enableSearch
  };
}

export function isTypesenseConfigured() {
  const { host, apiKey } = getTypesenseConfig();
  return Boolean(host && apiKey);
}

export function getTypesenseServerClient() {
  if (cachedClient) return cachedClient;

  const { host, port, protocol, apiKey } = getTypesenseConfig();

  if (!host || !apiKey) {
    throw new Error('Typesense env is missing. Set TYPESENSE_HOST and TYPESENSE_ADMIN_API_KEY.');
  }

  cachedClient = new Typesense.Client({
    nodes: [{ host, port, protocol }],
    apiKey,
    connectionTimeoutSeconds: 8,
    numRetries: 3
  });

  return cachedClient;
}
