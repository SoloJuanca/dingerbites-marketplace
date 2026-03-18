import { NextResponse } from 'next/server';

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || '0.0.0.0';
}

export function getRequestMeta(request) {
  return {
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestId:
      request.headers.get('x-request-id') ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  };
}

export function jsonError(message, status = 400, code = null, extras = {}) {
  return NextResponse.json(
    {
      error: message,
      ...(code ? { code } : {}),
      ...extras
    },
    { status }
  );
}
