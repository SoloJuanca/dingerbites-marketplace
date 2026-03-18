import { db } from './firebaseAdmin';

const AUDIT_COLLECTION = 'security_audit_logs';

export async function logSecurityEvent(event = {}) {
  try {
    const now = new Date().toISOString();
    const payload = {
      event_type: event.event_type || 'UNKNOWN_EVENT',
      result: event.result || 'unknown',
      actor_user_id: event.actor_user_id || null,
      actor_email: event.actor_email || null,
      target_order_id: event.target_order_id || null,
      target_coupon_id: event.target_coupon_id || null,
      ip: event.ip || null,
      user_agent: event.user_agent || null,
      request_id: event.request_id || null,
      details: event.details && typeof event.details === 'object' ? event.details : {},
      created_at: now
    };

    await db.collection(AUDIT_COLLECTION).doc().set(payload);
  } catch (error) {
    console.error('Failed to write security audit event:', error);
  }
}
