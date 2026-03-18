import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Secret key for JWT verification
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/profile');

  if (!isAdminRoute && !isProtectedRoute) {
    return NextResponse.next();
  }

  if (isAdminRoute || isProtectedRoute) {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      // Verify the JWT token
      const { payload } = await jwtVerify(token, secret);
      
      // Check if admin access is required
      if (isAdminRoute) {
        const userRole = payload.role || 'user';
        if (userRole !== 'admin' && userRole !== 'superadmin') {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
      }
      
      // Add user info to request headers for use in API routes
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', String(payload.userId || ''));
      requestHeaders.set('x-user-email', String(payload.email || ''));
      requestHeaders.set('x-user-role', payload.role || 'user');

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 