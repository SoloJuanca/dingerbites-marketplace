import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { createReviewLink, listReviewLinks } from '../../../../lib/firebaseReviewLinks';

// GET /api/reviews/links - List review links (admin only)
export async function GET(request) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const links = await listReviewLinks();
    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error listing review links:', error);
    return NextResponse.json({ error: 'Error al listar enlaces' }, { status: 500 });
  }
}

// POST /api/reviews/links - Create review link (admin only)
export async function POST(request) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { label } = body;
    const link = await createReviewLink({ label, created_by: user.id });
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl?.origin || '';
    const reviewUrl = `${baseUrl}/agregar-resena?link=${link.token}`;
    return NextResponse.json({
      link: { ...link, url: reviewUrl },
      message: 'Enlace creado correctamente'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review link:', error);
    return NextResponse.json({ error: 'Error al crear enlace' }, { status: 500 });
  }
}
