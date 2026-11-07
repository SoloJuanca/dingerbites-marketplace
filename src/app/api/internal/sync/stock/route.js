import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebaseAdmin';
import { assertStockAvailableForOrderItems } from '../../../../lib/orderStock';

const PRODUCTS_COLLECTION = 'products';
const SYNC_SECRET = process.env.INTERNAL_SYNC_SECRET || '';

function verifySyncSignature(request, rawBody) {
  const signature = request.headers.get('x-sync-signature');
  const timestamp = request.headers.get('x-sync-timestamp');
  const idempotencyKey = request.headers.get('x-idempotency-key');
  if (!SYNC_SECRET || !signature || !timestamp || !idempotencyKey) {
    return { valid: false, error: 'Missing sync headers' };
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return { valid: false, error: 'Timestamp expired' };
  }
  const payload = `${timestamp}.${idempotencyKey}.${rawBody}`;
  const expected = crypto.createHmac('sha256', SYNC_SECRET).update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { valid: false, error: 'Invalid signature' };
  }
  return { valid: true, idempotencyKey };
}

async function findTcgProductByTcgId(tcgProductId) {
  const snap = await db.collection(PRODUCTS_COLLECTION)
    .where('tcg_product_id', '==', Number(tcgProductId))
    .where('is_active', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function POST(request) {
  const rawBody = await request.text();
  const verification = verifySyncSignature(request, rawBody);
  if (!verification.valid) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const { action, tcg_product_id, quantity } = body;

  const product = await findTcgProductByTcgId(tcg_product_id);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  try {
    if (action === 'reserve') {
      await assertStockAvailableForOrderItems([{ product_id: product.id, quantity }]);
      await db.runTransaction(async (tx) => {
        const ref = db.collection(PRODUCTS_COLLECTION).doc(product.id);
        const doc = await tx.get(ref);
        const data = doc.data();
        const available = Math.max(0, Number(data.stock_quantity || 0));
        if (available < quantity) {
          const err = new Error('Insufficient stock');
          err.code = 'INSUFFICIENT_STOCK';
          throw err;
        }
        tx.update(ref, {
          stock_quantity: available - quantity,
          updated_at: new Date().toISOString()
        });
      });
    }

    if (action === 'release') {
      await db.runTransaction(async (tx) => {
        const ref = db.collection(PRODUCTS_COLLECTION).doc(product.id);
        const doc = await tx.get(ref);
        const data = doc.data();
        tx.update(ref, {
          stock_quantity: Number(data.stock_quantity || 0) + Number(quantity),
          updated_at: new Date().toISOString()
        });
      });
    }

    if (action === 'commit') {
      // Stock already deducted on reserve in this simplified flow
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 409 });
    }
    console.error('Ecommerce sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
