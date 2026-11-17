import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ENVIA_API_KEY = 'test-key';
const { generateShipmentLabel } = await import('../envia.js');

test('generateShipmentLabel surfaces an Envia error object even with HTTP 200', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(
    JSON.stringify({ meta: {}, error: { code: 'INVALID_SHIPMENT', message: 'Invalid shipment data' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );

  try {
    await assert.rejects(
      generateShipmentLabel({}),
      (error) => error.message === 'Invalid shipment data'
        && error.code === 'INVALID_SHIPMENT'
        && error.definitive === true
    );
  } finally {
    global.fetch = originalFetch;
  }
});
