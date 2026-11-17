import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEnviaLabelResponseData,
  getEnviaCarriers,
  getEnviaRateOptions,
  isEnviaInsufficientFundsError
} from '../envia.js';

test('getEnviaLabelResponseData reads the Envia meta.data response shape', () => {
  const result = getEnviaLabelResponseData({
    meta: {
      data: [{ trackingNumber: 'TRACK-123', label: 'https://labels.example/123.pdf' }]
    }
  });

  assert.equal(result.trackingNumber, 'TRACK-123');
  assert.equal(result.label, 'https://labels.example/123.pdf');
});

test('getEnviaCarriers normalizes a comma-separated list and removes duplicates', () => {
  assert.deepEqual(getEnviaCarriers('FedEx, dhl, fedex, , Estafeta'), [
    'fedex',
    'dhl',
    'estafeta'
  ]);
});

test('getEnviaCarriers rejects an empty carrier list', () => {
  assert.throws(
    () => getEnviaCarriers(' , '),
    (error) => error.code === 'ENVIA_CARRIER_NOT_CONFIGURED'
  );
});

test('getEnviaRateOptions returns selectable carrier services with prices', () => {
  const options = getEnviaRateOptions({
    data: [
      {
        carrier: 'fedex',
        carrierDescription: 'FedEx',
        service: 'GROUND',
        serviceDescription: 'FedEx Ground',
        totalPrice: 145,
        deliveryDays: 3
      },
      {
        carrier: 'dhl',
        carrierDescription: 'DHL',
        service: 'EXPRESS',
        serviceDescription: 'DHL Express',
        totalPrice: 220,
        deliveryDays: 1
      },
      { carrier: 'invalid', service: 'invalid', totalPrice: 'not-a-price' }
    ]
  });

  assert.equal(options.length, 2);
  assert.deepEqual(options.map(({ carrier, service, price }) => ({ carrier, service, price })), [
    { carrier: 'FedEx', service: 'FedEx Ground', price: 145 },
    { carrier: 'DHL', service: 'DHL Express', price: 220 }
  ]);
  assert.equal(options[0].deliveryDays, 3);
  assert.notEqual(options[0].id, options[1].id);
});

test('getEnviaRateOptions keeps the lowest price for duplicate carrier services', () => {
  const options = getEnviaRateOptions({
    quotes: [
      { carrier: 'fedex', service: 'GROUND', price: 150 },
      { carrier: 'fedex', service: 'GROUND', price: 125 }
    ]
  });

  assert.equal(options.length, 1);
  assert.equal(options[0].price, 125);
});

test('isEnviaInsufficientFundsError recognizes common API responses', () => {
  assert.equal(isEnviaInsufficientFundsError(new Error('Insufficient funds')), true);
  assert.equal(isEnviaInsufficientFundsError({ code: 'INSUFFICIENT_BALANCE' }), true);
  assert.equal(isEnviaInsufficientFundsError(new Error('Invalid postal code')), false);
});
