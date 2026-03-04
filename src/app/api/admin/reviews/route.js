import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { getGeneralReviewsAdmin } from '../../../../lib/firebaseReviews';

// GET /api/admin/reviews - List all general reviews for admin
export async function GET(request) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const approvedOnlyParam = searchParams.get('approved');
    let approvedOnly = null;
    if (approvedOnlyParam === 'true') approvedOnly = true;
    if (approvedOnlyParam === 'false') approvedOnly = false;

    const result = await getGeneralReviewsAdmin({ page, limit, approvedOnly });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    return NextResponse.json({ error: 'Error al obtener reseñas' }, { status: 500 });
  }
}
