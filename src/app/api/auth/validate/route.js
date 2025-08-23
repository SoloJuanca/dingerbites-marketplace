import { NextResponse } from 'next/server';
import { getUserFromToken } from '../../../../lib/auth';

// POST /api/auth/validate - Validate JWT token
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Get user from token (this will validate the token and check if user is active)
    const user = await getUserFromToken(token);
    
    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: user,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Error during token validation:', error);
    return NextResponse.json(
      { valid: false, error: 'Token validation failed' },
      { status: 500 }
    );
  }
}
