import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { getCouponsByUserId } from '../../../../lib/firebaseCoupons';

// GET /api/users/coupons - Get authenticated user's coupons
export async function GET(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const coupons = await getCouponsByUserId(user.id);
    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Error fetching user coupons:', error);
    return NextResponse.json({ error: 'Error al obtener cupones' }, { status: 500 });
  }
}
