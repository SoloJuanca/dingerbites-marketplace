import { NextResponse } from 'next/server';
import { comparePassword, generateToken } from '../../../../lib/auth';
import { getUserByEmail, updateUser } from '../../../../lib/firebaseUsers';
import { getRequestMeta, normalizeEmail } from '../../../../lib/security';
import { checkRateLimit } from '../../../../lib/rateLimit';
import { logSecurityEvent } from '../../../../lib/auditLog';

// POST /api/auth/login - User login
export async function POST(request) {
  try {
    const requestMeta = getRequestMeta(request);
    const body = await request.json();
    const { email, password } = body;
    const normalizedEmail = normalizeEmail(email);

    const rateLimitResult = checkRateLimit({
      routeKey: 'auth:login',
      ip: requestMeta.ip,
      email: normalizedEmail || null,
      limit: 8,
      windowMs: 60 * 1000
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await getUserByEmail(email);

    if (!user) {
      await logSecurityEvent({
        event_type: 'AUTH_LOGIN',
        result: 'rejected',
        actor_email: normalizedEmail || null,
        ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
        request_id: requestMeta.requestId,
        details: { reason: 'USER_NOT_FOUND' }
      });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      await logSecurityEvent({
        event_type: 'AUTH_LOGIN',
        result: 'rejected',
        actor_user_id: user.id,
        actor_email: normalizedEmail || null,
        ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
        request_id: requestMeta.requestId,
        details: { reason: 'ACCOUNT_DEACTIVATED' }
      });
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      await logSecurityEvent({
        event_type: 'AUTH_LOGIN',
        result: 'rejected',
        actor_user_id: user.id,
        actor_email: normalizedEmail || null,
        ip: requestMeta.ip,
        user_agent: requestMeta.userAgent,
        request_id: requestMeta.requestId,
        details: { reason: 'INVALID_PASSWORD' }
      });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await updateUser(user.id, {
      last_login_at: new Date().toISOString()
    });

    const token = generateToken(user);

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    await logSecurityEvent({
      event_type: 'AUTH_LOGIN',
      result: 'success',
      actor_user_id: user.id,
      actor_email: normalizedEmail || null,
      ip: requestMeta.ip,
      user_agent: requestMeta.userAgent,
      request_id: requestMeta.requestId
    });

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
} 