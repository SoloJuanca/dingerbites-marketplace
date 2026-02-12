import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth';
import { db } from '../../../lib/firebaseAdmin';

const WISHLIST_COLLECTION = 'wishlist_items';
const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const BRANDS_COLLECTION = 'product_brands';

// GET /api/wishlist - Get user's wishlist items
export async function GET(request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const wishlistSnapshot = await db
      .collection(WISHLIST_COLLECTION)
      .where('user_id', '==', user.id)
      .get();

    const rawWishlistItems = wishlistSnapshot.docs
      .map((doc) => ({ wishlist_id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    const productIds = [...new Set(rawWishlistItems.map((item) => String(item.product_id)).filter(Boolean))];
    const productDocs = await Promise.all(productIds.map((id) => db.collection(PRODUCTS_COLLECTION).doc(id).get()));
    const productsById = new Map(
      productDocs.filter((doc) => doc.exists).map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
    );

    const categoryIds = [...new Set([...productsById.values()].map((p) => p.category_id).filter(Boolean))];
    const brandIds = [...new Set([...productsById.values()].map((p) => p.brand_id).filter(Boolean))];

    const [categoryDocs, brandDocs] = await Promise.all([
      Promise.all(categoryIds.map((id) => db.collection(CATEGORIES_COLLECTION).doc(String(id)).get())),
      Promise.all(brandIds.map((id) => db.collection(BRANDS_COLLECTION).doc(String(id)).get()))
    ]);

    const categoriesById = new Map(categoryDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));
    const brandsById = new Map(brandDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]));

    const wishlistItems = rawWishlistItems
      .map((item) => {
        const product = productsById.get(String(item.product_id));
        if (!product || product.is_active === false) return null;

        const category = product.category_id ? categoriesById.get(String(product.category_id)) : null;
        const brand = product.brand_id ? brandsById.get(String(product.brand_id)) : null;
        const imageUrl =
          product.image ||
          (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '') ||
          '';

        return {
          wishlist_id: item.wishlist_id,
          added_at: item.created_at || null,
          id: product.id,
          slug: product.slug || '',
          name: product.name || '',
          description: product.description || '',
          price: Number(product.price || 0),
          compare_price: product.compare_price || null,
          is_active: product.is_active !== false,
          stock_quantity: Number(product.stock_quantity || 0),
          image_url: imageUrl,
          category_name: category?.name || null,
          brand_name: brand?.name || null
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      items: wishlistItems,
      total: wishlistItems.length
    });

  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

// POST /api/wishlist - Add item to wishlist
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
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists and is active
    const productDoc = await db.collection(PRODUCTS_COLLECTION).doc(String(productId)).get();
    const product = productDoc.exists ? { id: productDoc.id, ...productDoc.data() } : null;

    if (!product || product.is_active === false) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const existingSnapshot = await db
      .collection(WISHLIST_COLLECTION)
      .where('user_id', '==', user.id)
      .where('product_id', '==', String(productId))
      .limit(1)
      .get();
    const existingItem = !existingSnapshot.empty ? existingSnapshot.docs[0] : null;

    if (existingItem) {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const docRef = db.collection(WISHLIST_COLLECTION).doc();
    await docRef.set({
      user_id: user.id,
      product_id: String(productId),
      created_at: now,
      updated_at: now
    });

    return NextResponse.json({
      success: true,
      wishlistItemId: docRef.id,
      message: 'Product added to wishlist'
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}

// DELETE /api/wishlist - Remove item from wishlist
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
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const snapshot = await db
      .collection(WISHLIST_COLLECTION)
      .where('user_id', '==', user.id)
      .where('product_id', '==', String(productId))
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 }
      );
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Product removed from wishlist'
    });

  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}