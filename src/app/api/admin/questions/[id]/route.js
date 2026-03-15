import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../../lib/auth';
import { answerProductQuestion, getProductQuestionById } from '../../../../../lib/firebaseProductQuestions';
import { createNotification } from '../../../../../lib/firebaseNotifications';
import { sendQuestionAnsweredUserEmail } from '../../../../../lib/emailService';

// PATCH /api/admin/questions/[id] - answer question
export async function PATCH(request, { params }) {
  try {
    const user = await authenticateAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const questionId = String(params?.id || '').trim();
    if (!questionId) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const answer = String(body?.answer || '').trim();
    if (!answer) {
      return NextResponse.json({ error: 'La respuesta es requerida' }, { status: 400 });
    }

    const updated = await answerProductQuestion(questionId, {
      answer,
      adminUserId: user.id
    });

    const question = await getProductQuestionById(questionId);
    if (question?.user_id) {
      const productSlug = question?.product?.slug || '';
      const productName = question?.product?.name || 'Producto';
      const productLink = productSlug ? `/catalog/${productSlug}` : '/catalog';

      try {
        await createNotification({
          userId: question.user_id,
          type: 'product_question_answered',
          title: 'Tu pregunta fue respondida',
          message: `Ya respondimos tu pregunta sobre ${productName}.`,
          link: productLink,
          metadata: {
            question_id: question.id,
            product_id: question.product_id
          }
        });
      } catch (error) {
        console.error('Error creating user in-app question answer notification:', error);
      }

      try {
        await sendQuestionAnsweredUserEmail({
          email: question?.user?.email || '',
          customerName: `${question?.user?.first_name || ''} ${question?.user?.last_name || ''}`.trim(),
          productName,
          productSlug,
          question: question?.question || '',
          answer
        });
      } catch (error) {
        console.error('Error sending user question answered email:', error);
      }
    }

    return NextResponse.json({
      success: true,
      question: updated,
      message: 'Pregunta respondida correctamente'
    });
  } catch (error) {
    console.error('Error answering product question:', error);
    if (error.message === 'Question not found') {
      return NextResponse.json({ error: 'Pregunta no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al responder pregunta' }, { status: 500 });
  }
}
