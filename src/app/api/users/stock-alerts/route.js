import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../../lib/auth';
import { db } from '../../../../lib/firebaseAdmin';

const STOCK_ALERTS_COLLECTION = 'stock_alerts';
const PRODUCTS_COLLECTION = 'products';

function getProductImage(product) {
  if (product.image) return product.image;
  if (!Array.isArray(product.images) || product.images.length === 0) return '';
  const first = product.images[0];
  if (typeof first === 'string') return first;
  return first?.url || '';
}

// GET /api/users/stock-alerts - Get authenticated user's reminders
export async function GET(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const snapshot = await db
      .collection(STOCK_ALERTS_COLLECTION)
      .where('user_id', '==', user.id)
      .get();

    const reminders = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item) => item.is_active !== false)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const uniqueProductIds = [
      ...new Set(reminders.map((item) => String(item.product_id)).filter(Boolean))
    ];
    const productDocs = await Promise.all(
      uniqueProductIds.map((productId) => db.collection(PRODUCTS_COLLECTION).doc(productId).get())
    );

    const productsById = new Map(
      productDocs
        .filter((doc) => doc.exists)
        .map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    const items = reminders
      .map((reminder) => {
        const product = productsById.get(String(reminder.product_id));
        if (!product || product.is_active === false) return null;
        const stockQuantity = Number(product.stock_quantity || 0);
        return {
          id: reminder.id,
          product_id: String(reminder.product_id),
          created_at: reminder.created_at || null,
          updated_at: reminder.updated_at || null,
          is_active: reminder.is_active !== false,
          product: {
            id: product.id,
            slug: product.slug || '',
            name: product.name || '',
            image: getProductImage(product),
            stock_quantity: stockQuantity,
            allow_backorders: Boolean(product.allow_backorders)
          }
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      items,
      total: items.length
    });
  } catch (error) {
    console.error('Error fetching stock alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock alerts' },
      { status: 500 }
    );
  }
}

// POST /api/users/stock-alerts - Subscribe to a product stock alert
export async function POST(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = String(body?.productId || '').trim();
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const productDoc = await db.collection(PRODUCTS_COLLECTION).doc(productId).get();
    const product = productDoc.exists ? { id: productDoc.id, ...productDoc.data() } : null;
    if (!product || product.is_active === false) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const existingSnapshot = await db
      .collection(STOCK_ALERTS_COLLECTION)
      .where('user_id', '==', user.id)
      .where('product_id', '==', productId)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0];
      const existing = existingDoc.data();
      if (existing.is_active !== false) {
        return NextResponse.json({
          success: true,
          alreadySubscribed: true,
          reminderId: existingDoc.id,
          message: 'Stock reminder already active'
        });
      }

      await existingDoc.ref.update({
        is_active: true,
        updated_at: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        reminderId: existingDoc.id,
        message: 'Stock reminder activated'
      });
    }

    const now = new Date().toISOString();
    const docRef = db.collection(STOCK_ALERTS_COLLECTION).doc();
    await docRef.set({
      user_id: user.id,
      product_id: productId,
      is_active: true,
      created_at: now,
      updated_at: now
    });

    return NextResponse.json(
      {
        success: true,
        reminderId: docRef.id,
        message: 'Stock reminder created'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating stock alert:', error);
    return NextResponse.json(
      { error: 'Failed to create stock alert' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/stock-alerts?productId=... - Unsubscribe from stock alerts
export async function DELETE(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = String(searchParams.get('productId') || '').trim();
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const snapshot = await db
      .collection(STOCK_ALERTS_COLLECTION)
      .where('user_id', '==', user.id)
      .where('product_id', '==', productId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Stock reminder not found' },
        { status: 404 }
      );
    }

    const batch = db.batch();
    const now = new Date().toISOString();
    snapshot.docs.forEach((doc) =>
      batch.update(doc.ref, {
        is_active: false,
        updated_at: now
      })
    );
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Stock reminder removed'
    });
  } catch (error) {
    console.error('Error removing stock alert:', error);
    return NextResponse.json(
      { error: 'Failed to remove stock alert' },
      { status: 500 }
    );
  }
}
