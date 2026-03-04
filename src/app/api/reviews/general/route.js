import { NextResponse } from 'next/server';
import { getGeneralReviews, createGeneralReview } from '../../../../lib/firebaseReviews';
import { getOrderByReviewToken, setReviewTokenUsed } from '../../../../lib/firebaseOrders';
import { getReviewLinkByToken } from '../../../../lib/firebaseReviewLinks';
import { createFirstReviewCoupon } from '../../../../lib/firebaseCoupons';
import { hashPassword, generateToken } from '../../../../lib/auth';
import { createUser, getUserByEmail } from '../../../../lib/firebaseUsers';

// GET /api/reviews/general - List general (in-person) reviews
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;

    const result = await getGeneralReviews({ page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching general reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews/general - Create general review
// Supports: token (order, one-time) OR linkToken (admin link, reusable)
// Optional: registerAndClaim { email, password, firstName, lastName } - creates account + 5% coupon (if user doesn't already have FIRST_REVIEW)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      token,
      linkToken,
      author_name,
      rating,
      comment,
      image_url,
      location,
      registerAndClaim
    } = body;

    if ((!token || !token.trim()) && (!linkToken || !linkToken.trim())) {
      return NextResponse.json(
        { error: 'Enlace no válido. Usa el enlace que te compartió la tienda.' },
        { status: 400 }
      );
    }

    if (!author_name || !rating || !comment) {
      return NextResponse.json(
        { error: 'Nombre, calificación y comentario son requeridos' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La calificación debe ser entre 1 y 5' },
        { status: 400 }
      );
    }

    let orderId = null;
    let reviewLinkId = null;
    let userId = null;
    let userData = null;
    let couponAssigned = false;

    // Order token (one-time use)
    if (token && token.trim()) {
      const order = await getOrderByReviewToken(token.trim());
      if (!order) {
        return NextResponse.json(
          { error: 'Este enlace no es válido o ya fue utilizado.' },
          { status: 400 }
        );
      }
      orderId = order.id;
    }

    // Admin review link (reusable)
    if (linkToken && linkToken.trim()) {
      const link = await getReviewLinkByToken(linkToken.trim());
      if (!link) {
        return NextResponse.json(
          { error: 'Este enlace no es válido.' },
          { status: 400 }
        );
      }
      reviewLinkId = link.id;
    }

    // Register and claim 5% coupon (only when using linkToken)
    if (registerAndClaim && typeof registerAndClaim === 'object' && linkToken) {
      const { email, password, firstName, lastName } = registerAndClaim;
      if (!email || !password || !firstName || !lastName) {
        return NextResponse.json(
          { error: 'Email, contraseña, nombre y apellido son requeridos para crear cuenta.' },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Formato de email inválido.' },
          { status: 400 }
        );
      }
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 8 caracteres.' },
          { status: 400 }
        );
      }
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { error: 'Ya existe una cuenta con este email. Inicia sesión.' },
          { status: 409 }
        );
      }
      const passwordHash = await hashPassword(password);
      const newUser = await createUser({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone: null,
        is_active: true,
        is_verified: false,
        is_admin: false,
        role: 'user'
      });
      if (!newUser) {
        return NextResponse.json(
          { error: 'Error al crear la cuenta.' },
          { status: 500 }
        );
      }
      userId = newUser.id;
      const { password_hash, ...safeUser } = newUser;
      userData = safeUser;

      const coupon = await createFirstReviewCoupon(userId);
      if (coupon) {
        couponAssigned = true;
      }
    }

    const review = await createGeneralReview({
      author_name,
      rating,
      comment,
      image_url: image_url || null,
      location: location || null,
      order_id: orderId,
      review_link_id: reviewLinkId,
      user_id: userId
    });

    if (orderId) {
      await setReviewTokenUsed(orderId);
    }

    const response = {
      success: true,
      review,
      message: '¡Gracias! Tu reseña se ha publicado.'
    };
    if (userData) {
      response.user = userData;
      response.token = generateToken({ id: userData.id, email: userData.email, first_name: userData.first_name, last_name: userData.last_name, role: userData.role });
      response.couponAssigned = couponAssigned;
      if (couponAssigned) {
        response.message = '¡Gracias! Tu reseña se ha publicado. Tu cupón del 5% está en tu perfil.';
      }
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating general review:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    );
  }
}
