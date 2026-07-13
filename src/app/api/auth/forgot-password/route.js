import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { getUserByEmail, setPasswordResetToken } from '../../../../lib/firebaseUsers';
import { sendPasswordResetEmail } from '../../../../lib/emailService';
import { getRequestMeta, normalizeEmail } from '../../../../lib/security';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { logSecurityEvent } from '../../../../lib/auditLog';

const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const GENERIC_RESPONSE = {
  message:
    'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.'
};

// POST /api/auth/forgot-password - Solicitar enlace de recuperación
export async function POST(request) {
  const requestMeta = getRequestMeta(request);

  try {
    const body = await request.json();
    const normalizedEmail = normalizeEmail(body?.email);

    const rateLimitResult = checkRateLimit({
      routeKey: 'auth:forgot-password',
      ip: requestMeta.ip,
      email: normalizedEmail || null,
      limit: 5,
      windowMs: 60 * 1000
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        { status: 429 }
      );
    }

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'El correo es requerido' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(normalizedEmail);

    if (user && user.is_active) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

      await setPasswordResetToken(user.id, { tokenHash, expiresAt });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/auth/reset-password?token=${rawToken}`;

      const emailResult = await sendPasswordResetEmail({
        email: user.email,
        name: user.first_name,
        resetUrl
      });

      await logSecurityEvent({
        event_type: 'AUTH_PASSWORD_RESET_REQUEST',
        result: emailResult?.success ? 'success' : 'error',
        actor_user_id: user.id,
        actor_email: normalizedEmail,
        ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
        request_id: requestMeta.requestId,
        details: emailResult?.success ? {} : { reason: 'EMAIL_SEND_FAILED' }
      });
    } else {
      await logSecurityEvent({
        event_type: 'AUTH_PASSWORD_RESET_REQUEST',
        result: 'rejected',
        actor_email: normalizedEmail,
        ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
        request_id: requestMeta.requestId,
        details: { reason: user ? 'ACCOUNT_INACTIVE' : 'USER_NOT_FOUND' }
      });
    }

    // Respuesta genérica para evitar enumeración de usuarios
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Error requesting password reset:', error);
    // También respuesta genérica ante error interno
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
