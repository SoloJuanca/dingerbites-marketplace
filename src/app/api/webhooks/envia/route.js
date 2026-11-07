import { NextResponse } from 'next/server';
import { verifyEnviaWebhook } from '../../../../lib/enviaWebhooks';
import { handleEnviaWebhookRequest } from '../../../../lib/enviaWebhookHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rawBody = await request.text();

  let parsedBody = {};
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const verification = verifyEnviaWebhook(request, rawBody, parsedBody);
  if (!verification.valid) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  try {
    const outcome = await handleEnviaWebhookRequest(request, rawBody, parsedBody);
    return NextResponse.json({
      received: true,
      duplicate: outcome.duplicate || false,
      handled: outcome.result?.handled ?? null
    });
  } catch (error) {
    console.error('Envia webhook processing failed:', error);
    return NextResponse.json({ received: true, error: 'processing_failed' });
  }
}
