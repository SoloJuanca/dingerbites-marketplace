import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../../lib/auth';
import { toggleCouponActive } from '../../../../../../lib/firebaseCoupons';
import { jsonError } from '../../../../../../lib/security';

export async function POST(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const body = await request.json().catch(() => ({}));
    const nextActive = body?.active;
    if (typeof nextActive !== 'boolean') {
      return jsonError('Field "active" must be boolean', 400, 'INVALID_ACTIVE_VALUE');
    }

    const { id } = await params;
    const updated = await toggleCouponActive(String(id), nextActive, admin.id);
    if (!updated) {
      return jsonError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: `Coupon ${nextActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling coupon:', error);
    return jsonError('Failed to toggle coupon', 500, 'COUPON_TOGGLE_FAILED');
  }
}
