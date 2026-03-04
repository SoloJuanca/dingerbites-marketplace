import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { validateCoupon } from '../../../../lib/firebaseCoupons';

// POST /api/orders/validate-coupon - Validate coupon for checkout
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code, subtotal } = body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Código de cupón requerido' }, { status: 400 });
    }
    const sub = Number(subtotal) || 0;
    const user = await authenticateUser(request);
    const userId = user ? user.id : null;

    // Coupons require authentication - they are user-specific
    if (!userId) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para usar un cupón' },
        { status: 401 }
      );
    }

    const result = await validateCoupon(code.trim(), userId, sub);
    if (!result) {
      return NextResponse.json(
        { error: 'Cupón no válido, expirado o ya utilizado' },
        { status: 400 }
      );
    }
    return NextResponse.json({
      valid: true,
      coupon: {
        id: result.id,
        code: result.code,
        type: result.type,
        value: result.value,
        discount_amount: result.discount_amount
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json({ error: 'Error al validar cupón' }, { status: 500 });
  }
}
