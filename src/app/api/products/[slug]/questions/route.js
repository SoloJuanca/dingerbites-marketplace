import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../../lib/auth';
import { getProductBySlug } from '../../../../../lib/firebaseProducts';
import { createProductQuestion, getPublicProductQuestions } from '../../../../../lib/firebaseProductQuestions';
import { createNotificationsForAdmins } from '../../../../../lib/firebaseNotifications';
import { sendNewQuestionAdminNotificationEmail } from '../../../../../lib/emailService';

async function getResolvedProductId(slug) {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) return null;
  const product = await getProductBySlug(normalizedSlug);
  return product?.id ? String(product.id) : null;
}

// GET /api/products/[slug]/questions - public answered questions
export async function GET(request, { params }) {
  try {
    const productId = await getResolvedProductId(params?.slug);
    if (!productId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const questions = await getPublicProductQuestions(productId);
    return NextResponse.json({
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error fetching product questions:', error);
    return NextResponse.json({ error: 'Failed to fetch product questions' }, { status: 500 });
  }
}

// POST /api/products/[slug]/questions - create question (authenticated user)
export async function POST(request, { params }) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const productId = await getResolvedProductId(params?.slug);
    if (!productId) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const question = String(body?.question || '').trim();
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (question.length < 8) {
      return NextResponse.json(
        { error: 'La pregunta debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const created = await createProductQuestion({
      productId,
      userId: user.id,
      question
    });

    const productName = created?.product?.name || 'Producto';
    const productSlug = created?.product?.slug || '';
    const customerName = `${created?.user?.first_name || ''} ${created?.user?.last_name || ''}`.trim() || created?.user?.email || 'Usuario';
    const adminLink = `/admin/questions?questionId=${encodeURIComponent(created.id)}`;

    try {
      await createNotificationsForAdmins({
        type: 'product_question_created',
        title: 'Nueva pregunta de producto',
        message: `${customerName} preguntó sobre ${productName}.`,
        link: adminLink,
        metadata: {
          question_id: created.id,
          product_id: created.product_id
        }
      });
    } catch (error) {
      console.error('Error creating admin in-app question notifications:', error);
    }

    try {
      await sendNewQuestionAdminNotificationEmail({
        productName,
        productSlug,
        question: created.question,
        customerName,
        questionId: created.id
      });
    } catch (error) {
      console.error('Error sending admin question email:', error);
    }

    return NextResponse.json(
      {
        success: true,
        question: {
          id: created.id,
          question: created.question,
          status: created.status,
          created_at: created.created_at
        },
        message: 'Pregunta enviada correctamente'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product question:', error);
    if (error.message === 'Product not found') {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create product question' }, { status: 500 });
  }
}
