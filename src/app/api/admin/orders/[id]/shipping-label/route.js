import { NextResponse } from 'next/server';
import { authenticateUser, isAdmin } from '../../../../../../lib/auth';
import { createEnviaShippingLabelForOrder } from '../../../../../../lib/enviaShippingLabels';

export async function POST(request, { params }) {
  const user = await authenticateUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const retryNeedsReview = body.confirmedNoExistingLabel === true;
    if (body.retryNeedsReview === true && !retryNeedsReview) {
      return NextResponse.json(
        { error: 'Confirma primero que no existe una guía en tu cuenta de Envia.' },
        { status: 400 }
      );
    }
    const result = await createEnviaShippingLabelForOrder(id, {
      retryFailed: true,
      retryNeedsReview
    });
    if (result.status === 'purchased' || result.status === 'already_created') {
      return NextResponse.json(result);
    }
    if (result.status === 'needs_review') {
      return NextResponse.json(
        { error: 'No se reintentó la solicitud porque Envia pudo haber creado ya la guía. Revisa la cuenta de Envia antes de continuar.' },
        { status: 409 }
      );
    }
    if (result.status === 'creating') {
      return NextResponse.json(
        { error: 'La creación de la guía sigue en proceso. Espera antes de volver a intentarlo.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: result.error || 'Envia no pudo crear la guía.' },
      { status: 502 }
    );
  } catch (error) {
    const status = error.code === 'ORDER_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: error.message || 'No se pudo crear la guía.' }, { status });
  }
}
