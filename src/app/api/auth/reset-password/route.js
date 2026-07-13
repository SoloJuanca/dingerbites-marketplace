import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { hashPassword } from '../../../../lib/auth';
import {
  getUserByResetTokenHash,
  clearPasswordResetToken
} from '../../../../lib/firebaseUsers';
import { getRequestMeta } from '../../../../lib/security';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { logSecurityEvent } from '../../../../lib/auditLog';

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

// GET /api/auth/reset-password?token=... - Validar el token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || !token.trim()) {
      return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 });
    }

    const user = await getUserByResetTokenHash(hashToken(token.trim()));
    if (!user) {
      return NextResponse.json({ valid: false, error: 'El enlace no es válido o ha expirado' });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error validating reset token:', error);
    return NextResponse.json(
      { valid: false, error: 'Error al validar el enlace' },
      { status: 500 }
    );
  }
}

// POST /api/auth/reset-password - Establecer nueva contraseña
export async function POST(request) {
  const requestMeta = getRequestMeta(request);

  try {
    const rateLimitResult = checkRateLimit({
      routeKey: 'auth:reset-password',
      ip: requestMeta.ip,
      limit: 10,
      windowMs: 60 * 1000
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, password } = body || {};

    if (!token || !String(token).trim()) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    if (!password || String(password).length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const user = await getUserByResetTokenHash(hashToken(String(token).trim()));
    if (!user) {
      await logSecurityEvent({
        event_type: 'AUTH_PASSWORD_RESET_COMPLETE',
        result: 'rejected',
        ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
        request_id: requestMeta.requestId,
        details: { reason: 'INVALID_OR_EXPIRED_TOKEN' }
      });
      return NextResponse.json(
        { error: 'El enlace no es válido o ha expirado' },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(String(password));
    await clearPasswordResetToken(user.id, { newPasswordHash });

    await logSecurityEvent({
      event_type: 'AUTH_PASSWORD_RESET_COMPLETE',
      result: 'success',
      actor_user_id: user.id,
      actor_email: user.email || null,
      ip: requestMeta.ip,
      user_agent: requestMeta.userAgent,
      request_id: requestMeta.requestId
    });

    return NextResponse.json({ message: 'Tu contraseña ha sido actualizada correctamente' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'No se pudo restablecer la contraseña' },
      { status: 500 }
    );
  }
}
