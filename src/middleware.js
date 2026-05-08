import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Secret key for JWT verification
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

function getClientIp(request) {
  // Best-effort: depends on hosting/CDN. Useful for anomaly detection.
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-client-ip') ||
    ''
  );
}

function shouldLogRequest(pathname) {
  if (!pathname.startsWith('/api/')) return false;
  // Avoid noisy/expensive logs from frequent internal callbacks
  if (pathname.startsWith('/api/webhooks/')) return false;
  return true;
}

function isHighRiskPublicPath(pathname) {
  if (pathname === '/sitemap.xml') return true;
  if (pathname === '/sitemap') return true;
  if (pathname.startsWith('/api/search/')) return true;
  if (pathname === '/api/home') return true;
  return false;
}

function getRateLimitConfig(pathname) {
  // Generous defaults: protect against bots, not humans.
  // Limits are per IP + route-group in a rolling window.
  if (pathname === '/sitemap.xml' || pathname === '/sitemap') {
    return { windowMs: 60_000, max: 20, key: 'sitemap' };
  }
  if (pathname === '/api/search/suggestions') {
    return { windowMs: 60_000, max: 240, key: 'search_suggestions' };
  }
  if (pathname === '/api/search/products') {
    return { windowMs: 60_000, max: 120, key: 'search_products' };
  }
  if (pathname.startsWith('/api/search/')) {
    return { windowMs: 60_000, max: 120, key: 'search' };
  }
  if (pathname === '/api/home') {
    return { windowMs: 60_000, max: 120, key: 'home' };
  }
  return { windowMs: 60_000, max: 300, key: 'api' };
}

function getRateLimitStore() {
  // Best-effort store. In serverless/edge this is per-instance.
  if (!globalThis.__rateLimitStore) {
    globalThis.__rateLimitStore = new Map();
  }
  return globalThis.__rateLimitStore;
}

function checkRateLimit({ ip, pathname }) {
  const { windowMs, max, key } = getRateLimitConfig(pathname);
  const store = getRateLimitStore();
  const now = Date.now();
  const bucketKey = `${key}::${ip || 'unknown'}`;
  const entry = store.get(bucketKey) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  store.set(bucketKey, entry);

  const remaining = Math.max(0, max - entry.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    ok: entry.count <= max,
    limit: max,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds
  };
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  const isAdminApiRoute = pathname.startsWith('/api/admin');
  const startedAt = Date.now();
  const requestId =
    request.headers.get('x-request-id') ||
    (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  // UI routes (/admin, /profile, etc.) are protected client-side in layouts/pages.
  // Middleware auth here is API-focused because browser navigation does not send Authorization headers.
  const clientIp = getClientIp(request);
  const shouldRateLimit = isHighRiskPublicPath(pathname) && !isAdminApiRoute;
  if (shouldRateLimit) {
    const rate = checkRateLimit({ ip: clientIp, pathname });
    if (!rate.ok) {
      const res = NextResponse.json(
        { error: 'Too many requests', request_id: requestId },
        { status: 429 }
      );
      res.headers.set('x-request-id', requestId);
      res.headers.set('retry-after', String(rate.retryAfterSeconds));
      res.headers.set('x-ratelimit-limit', String(rate.limit));
      res.headers.set('x-ratelimit-remaining', String(rate.remaining));
      res.headers.set('x-ratelimit-reset', String(rate.resetAt));
      res.headers.set('cache-control', 'no-store');
      console.info(
        JSON.stringify({
          kind: 'rate_limited',
          request_id: requestId,
          method: request.method,
          path: pathname,
          status: 429,
          ip: clientIp,
          ua: request.headers.get('user-agent') || '',
          retry_after_s: rate.retryAfterSeconds
        })
      );
      return res;
    }
  }

  if (!isApiRoute) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', requestId);
    return res;
  }

  if (isAdminApiRoute) {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const res = NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
      res.headers.set('x-request-id', requestId);
      if (shouldLogRequest(pathname)) {
        console.info(
          JSON.stringify({
            kind: 'api_request',
            request_id: requestId,
            method: request.method,
            path: pathname,
            status: 401,
            ip: clientIp,
            ua: request.headers.get('user-agent') || '',
            ms: Date.now() - startedAt
          })
        );
      }
      return res;
    }

    const token = authHeader.substring(7);

    try {
      // Verify the JWT token
      const { payload } = await jwtVerify(token, secret);
      
      const userRole = payload.role || 'user';
      if (userRole !== 'admin' && userRole !== 'superadmin') {
        const res = NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
        res.headers.set('x-request-id', requestId);
        if (shouldLogRequest(pathname)) {
          console.info(
            JSON.stringify({
              kind: 'api_request',
              request_id: requestId,
              method: request.method,
              path: pathname,
              status: 403,
              ip: clientIp,
              ua: request.headers.get('user-agent') || '',
              ms: Date.now() - startedAt
            })
          );
        }
        return res;
      }

      // Add user info to request headers for use in API routes
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', String(payload.userId || ''));
      requestHeaders.set('x-user-email', String(payload.email || ''));
      requestHeaders.set('x-user-role', payload.role || 'user');
      requestHeaders.set('x-request-id', requestId);

      const res = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      res.headers.set('x-request-id', requestId);
      if (shouldLogRequest(pathname)) {
        console.info(
          JSON.stringify({
            kind: 'api_request',
            request_id: requestId,
            method: request.method,
            path: pathname,
            status: 200,
            ip: clientIp,
            ua: request.headers.get('user-agent') || '',
            ms: Date.now() - startedAt,
            admin: true
          })
        );
      }
      return res;

    } catch (error) {
      const res = NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
      res.headers.set('x-request-id', requestId);
      if (shouldLogRequest(pathname)) {
        console.info(
          JSON.stringify({
            kind: 'api_request',
            request_id: requestId,
            method: request.method,
            path: pathname,
            status: 401,
            ip: clientIp,
            ua: request.headers.get('user-agent') || '',
            ms: Date.now() - startedAt
          })
        );
      }
      return res;
    }
  }

  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  if (shouldLogRequest(pathname)) {
    console.info(
      JSON.stringify({
        kind: 'api_request',
        request_id: requestId,
        method: request.method,
        path: pathname,
        status: 200,
        ip: clientIp,
        ua: request.headers.get('user-agent') || '',
        ms: Date.now() - startedAt
      })
    );
  }
  return res;
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