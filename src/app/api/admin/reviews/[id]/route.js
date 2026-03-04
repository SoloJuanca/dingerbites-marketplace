import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { updateGeneralReview } from '../../../../../lib/firebaseReviews';

// PATCH /api/admin/reviews/[id] - Approve/reject review (admin only)
export async function PATCH(request, { params }) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const { is_approved } = body;
    if (typeof is_approved !== 'boolean') {
      return NextResponse.json({ error: 'is_approved debe ser true o false' }, { status: 400 });
    }
    const updated = await updateGeneralReview(id, { is_approved });
    if (!updated) {
      return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ review: updated, message: 'Reseña actualizada' });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Error al actualizar reseña' }, { status: 500 });
  }
}
