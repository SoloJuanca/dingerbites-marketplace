import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../../lib/auth';
import { storage } from '../../../../lib/firebaseAdmin';

/**
 * POST /api/admin/fetch-image-for-crop
 * Server-side fetch of a product image so the client can draw to canvas without CORS taint.
 * Only allows URLs from this project's Firebase Storage bucket.
 */
export async function POST(request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const imageUrl = body?.url;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (!imageUrl.startsWith('https://storage.googleapis.com/')) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
    }

    const bucket = storage.bucket();
    const allowedPrefix = `https://storage.googleapis.com/${bucket.name}/`;
    if (!imageUrl.startsWith(allowedPrefix)) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
    }

    const upstream = await fetch(imageUrl, { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    console.error('fetch-image-for-crop:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
