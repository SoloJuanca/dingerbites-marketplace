/** Anticipo 50% contra entrega + recogida: mismo umbral en cliente y en `orderCreation`. */
export const CASH_ADVANCE_PROOF_MIN_TOTAL_MXN = 50;

export const PAYMENT_PROOF_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp';

export function validatePaymentProofImageFile(file) {
  if (!file) {
    return { ok: false, message: 'Selecciona una imagen del comprobante.' };
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { ok: false, message: 'Solo se permiten imágenes JPG, PNG o WebP.' };
  }
  const maxMb = 5;
  if (file.size > maxMb * 1024 * 1024) {
    return { ok: false, message: `La imagen no debe superar ${maxMb} MB.` };
  }
  return { ok: true };
}
