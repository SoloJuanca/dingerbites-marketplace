import { NextResponse } from 'next/server';
import { getOrderByReviewToken } from '../../../../lib/firebaseOrders';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token || !token.trim()) {
      return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 });
    }
    const order = await getOrderByReviewToken(token.trim());
    if (!order) {
      return NextResponse.json({ valid: false, error: 'Enlace no valido o ya utilizado' });
    }
    return NextResponse.json({
      valid: true,
      order_id: order.id,
      order_number: order.order_number || null
    });
  } catch (error) {
    console.error('Error validating review token:', error);
    return NextResponse.json(
      { valid: false, error: 'Error al validar el enlace' },
      { status: 500 }
    );
  }
}
