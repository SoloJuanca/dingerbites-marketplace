import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { createCoupon, listCouponsAdmin } from '../../../../lib/firebaseCoupons';
import { jsonError } from '../../../../lib/security';

function normalizeCouponPayload(body = {}) {
  return {
    code: body.code,
    active: body.active,
    valid_from: body.valid_from || null,
    expires_at: body.expires_at || null,
    timezone: body.timezone || 'UTC',
    discount_type: body.discount_type,
    discount_value: body.discount_value,
    max_discount_amount: body.max_discount_amount ?? null,
    min_order_amount: body.min_order_amount ?? 0,
    scope_type: body.scope_type || 'global',
    scope_ids: Array.isArray(body.scope_ids) ? body.scope_ids : [],
    target_type: body.target_type || 'all',
    target_user_id: body.target_user_id || null,
    target_email_normalized: body.target_email_normalized || null,
    usage_mode: body.usage_mode || 'single_use',
    max_redemptions_total: body.max_redemptions_total ?? null,
    max_redemptions_per_user: body.max_redemptions_per_user ?? null,
    source: body.source || 'ADMIN',
    metadata: body.metadata || {}
  };
}

export async function GET(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      q: searchParams.get('q') || '',
      active: searchParams.get('active') || '',
      scope_type: searchParams.get('scope_type') || ''
    };

    const coupons = await listCouponsAdmin(filters);
    return NextResponse.json({ success: true, coupons });
  } catch (error) {
    console.error('Error listing coupons:', error);
    return jsonError('Failed to list coupons', 500, 'COUPONS_LIST_FAILED');
  }
}

export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON body', 400, 'INVALID_BODY');
    }

    const couponPayload = normalizeCouponPayload(body);
    const created = await createCoupon(couponPayload, admin.id);
    return NextResponse.json(
      { success: true, coupon: created, message: 'Coupon created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating coupon:', error);
    const message = error?.message || 'Failed to create coupon';
    return jsonError(message, 400, 'COUPON_CREATE_FAILED');
  }
}
