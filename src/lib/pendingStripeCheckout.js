export const PENDING_STRIPE_CHECKOUTS_COLLECTION = 'pending_stripe_checkouts';

/** Draft checkout documents expire after this TTL (ms). */
export const PENDING_STRIPE_CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;

export function getPublicSiteBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    '';
  const trimmed = String(raw).trim().replace(/\/$/, '');
  return trimmed || 'http://localhost:3000';
}
