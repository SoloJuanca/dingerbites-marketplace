import { NextResponse } from 'next/server';
import { getUserFromToken, generateToken } from '../../../../lib/auth';

// POST /api/auth/refresh - Refresh JWT token
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Get user from token (this will validate the token and check if user is active)
    const user = await getUserFromToken(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Generate new token
    const newToken = generateToken(user);

    return NextResponse.json({
      token: newToken,
      user: user,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Error during token refresh:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
