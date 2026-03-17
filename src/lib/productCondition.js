export const DEFAULT_PRODUCT_CONDITION = 'nuevo sellado';

export const PRODUCT_CONDITIONS = [
  'nuevo sellado',
  'nuevo abierto',
  'segunda mano'
];

export const PRODUCT_CONDITION_LABELS = {
  'nuevo sellado': 'Nuevo sellado',
  'nuevo abierto': 'Nuevo abierto',
  'segunda mano': 'Segunda mano'
};

export function normalizeProductCondition(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export function isValidProductCondition(value) {
  return PRODUCT_CONDITIONS.includes(normalizeProductCondition(value));
}

export function sanitizeProductCondition(value, fallback = DEFAULT_PRODUCT_CONDITION) {
  const normalized = normalizeProductCondition(value);
  if (isValidProductCondition(normalized)) return normalized;
  return fallback;
}
