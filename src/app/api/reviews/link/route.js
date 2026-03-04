import { NextResponse } from 'next/server';
import { getReviewLinkByToken } from '../../../../lib/firebaseReviewLinks';

// GET /api/reviews/link?token=XXX - Validate admin review link token (public)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || searchParams.get('link');
    if (!token || !token.trim()) {
      return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 });
    }
    const link = await getReviewLinkByToken(token.trim());
    if (!link) {
      return NextResponse.json({ valid: false, error: 'Enlace no válido' });
    }
    return NextResponse.json({
      valid: true,
      link_id: link.id,
      label: link.label || null
    });
  } catch (error) {
    console.error('Error validating review link:', error);
    return NextResponse.json(
      { valid: false, error: 'Error al validar el enlace' },
      { status: 500 }
    );
  }
}
