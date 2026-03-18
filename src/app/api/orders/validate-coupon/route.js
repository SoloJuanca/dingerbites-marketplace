import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { validateCoupon } from '../../../../lib/firebaseCoupons';
import { buildPricedOrderItems, buildPricedServiceItems, computeSubtotal } from '../../../../lib/orderPricing';
import { getRequestMeta, jsonError, normalizeEmail } from '../../../../lib/security';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { logSecurityEvent } from '../../../../lib/auditLog';

// POST /api/orders/validate-coupon - Validate coupon for checkout
export async function POST(request) {
  try {
    const requestMeta = getRequestMeta(request);
    const body = await request.json().catch(() => ({}));
    const { code, customer_email, items = [], service_items = [] } = body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return jsonError('Código de cupón requerido', 400, 'COUPON_CODE_REQUIRED');
    }

    const user = await authenticateUser(request);
    const userId = user ? user.id : null;
    const normalizedEmail = normalizeEmail(customer_email || user?.email || '');

    const rateLimitResult = checkRateLimit({
      routeKey: 'orders:validate-coupon',
      ip: requestMeta.ip,
      userId: userId || null,
      email: normalizedEmail || null,
      limit: 12,
      windowMs: 60 * 1000
    });
    if (!rateLimitResult.allowed) {
      return jsonError('Too many coupon validation requests', 429, 'RATE_LIMITED', {
        retry_after_ms: rateLimitResult.retryAfterMs
      });
    }

    if (!normalizedEmail) {
      return jsonError('Se requiere correo para validar cupón', 400, 'CUSTOMER_EMAIL_REQUIRED');
    }

    const pricedItems = await buildPricedOrderItems(items);
    const pricedServiceItems = await buildPricedServiceItems(service_items);
    const subtotal = computeSubtotal(pricedItems, pricedServiceItems);

    if (subtotal <= 0) {
      return jsonError('No hay artículos válidos para validar cupón', 400, 'EMPTY_CHECKOUT');
    }

    const result = await validateCoupon({
      code: code.trim(),
      userId,
      customerEmail: normalizedEmail,
      items: pricedItems,
      orderSubtotal: subtotal
    });

    if (!result) {
      await logSecurityEvent({
        event_type: 'COUPON_VALIDATE',
        result: 'rejected',
        actor_user_id: userId || null,
        actor_email: normalizedEmail || null,
        ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
        request_id: requestMeta.requestId,
        details: { code: String(code || '').trim().toUpperCase() }
      });
      return NextResponse.json(
        { error: 'Cupón no válido, expirado o ya utilizado' },
        { status: 400 }
      );
    }

    await logSecurityEvent({
      event_type: 'COUPON_VALIDATE',
      result: 'accepted',
      actor_user_id: userId || null,
      actor_email: normalizedEmail || null,
      target_coupon_id: result.id,
      ip: requestMeta.ip,
      user_agent: requestMeta.userAgent,
      request_id: requestMeta.requestId,
      details: {
        code: result.code,
        discount_amount: result.discount_amount
      }
    });

    return NextResponse.json({
      valid: true,
      coupon: {
        id: result.id,
        code: result.code,
        type: result.discount_type,
        value: result.discount_value,
        discount_amount: result.discount_amount,
        eligible_subtotal: result.eligible_subtotal
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ error: 'Error al validar cupón' }, { status: 500 });
  }
}
