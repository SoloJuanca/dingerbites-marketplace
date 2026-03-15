import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { getAdminProductQuestions } from '../../../../lib/firebaseProductQuestions';

// GET /api/admin/questions - list questions for admin
export async function GET(request) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const productId = searchParams.get('productId') || '';
    const questionId = searchParams.get('questionId') || '';

    const result = await getAdminProductQuestions({
      page,
      limit,
      status,
      search,
      productId,
      questionId
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching admin product questions:', error);
    return NextResponse.json({ error: 'Error al obtener preguntas' }, { status: 500 });
  }
}
