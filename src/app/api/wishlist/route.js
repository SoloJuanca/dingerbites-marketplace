import { NextResponse } from 'next/server';
import { getRows, getRow, query } from '../../../lib/database';
import { authenticateUser } from '../../../lib/auth';

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

    const wishlistQuery = `
      SELECT wi.id as wishlist_id, wi.created_at as added_at,
             p.id, p.slug, p.name, p.description, p.price, p.compare_price,
             p.is_active, p.stock_quantity,
             COALESCE(pi.image_url, '') as image_url,
             pc.name as category_name,
             pb.name as brand_name
      FROM wishlist_items wi
      JOIN products p ON wi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_brands pb ON p.brand_id = pb.id
      WHERE wi.user_id = $1 AND p.is_active = true
      ORDER BY wi.created_at DESC
    `;

    const wishlistItems = await getRows(wishlistQuery, [user.id]);

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
    const product = await getRow(
      'SELECT id, name FROM products WHERE id = $1 AND is_active = true',
      [productId]
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if item is already in wishlist
    const existingItem = await getRow(
      'SELECT id FROM wishlist_items WHERE user_id = $1 AND product_id = $2',
      [user.id, productId]
    );

    if (existingItem) {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 409 }
      );
    }

    // Add to wishlist
    const insertQuery = `
      INSERT INTO wishlist_items (user_id, product_id)
      VALUES ($1, $2)
      RETURNING id, created_at
    `;

    const result = await getRow(insertQuery, [user.id, productId]);

    return NextResponse.json({
      success: true,
      wishlistItemId: result.id,
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

    // Remove from wishlist
    const deleteQuery = `
      DELETE FROM wishlist_items 
      WHERE user_id = $1 AND product_id = $2
    `;

    const result = await query(deleteQuery, [user.id, productId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 }
      );
    }

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