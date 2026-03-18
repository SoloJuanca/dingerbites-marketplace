import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { db } from '../../../../../lib/firebaseAdmin';
import { updateCoupon } from '../../../../../lib/firebaseCoupons';
import { jsonError } from '../../../../../lib/security';

const COUPONS_COLLECTION = 'coupons';

function normalizePatchPayload(body = {}) {
  const patch = { ...body };
  delete patch.id;
  delete patch.created_at;
  delete patch.created_by;
  delete patch.redemptions_count;
  return patch;
}

export async function GET(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const { id } = await params;
    const doc = await db.collection(COUPONS_COLLECTION).doc(String(id)).get();
    if (!doc.exists) {
      return jsonError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    return NextResponse.json({
      success: true,
      coupon: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return jsonError('Failed to fetch coupon', 500, 'COUPON_GET_FAILED');
  }
}

export async function PATCH(request, { params }) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return jsonError('Admin access required', 401, 'UNAUTHORIZED');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return jsonError('Invalid JSON body', 400, 'INVALID_BODY');
    }

    const { id } = await params;
    const updated = await updateCoupon(String(id), normalizePatchPayload(body), admin.id);
    if (!updated) {
      return jsonError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    const message = error?.message || 'Failed to update coupon';
    return jsonError(message, 400, 'COUPON_UPDATE_FAILED');
  }
}
