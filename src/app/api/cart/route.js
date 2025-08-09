import { NextResponse } from 'next/server';
import { getRows, getRow, query, transaction } from '../../../lib/database';

// GET /api/cart - Get cart items for user or session
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'User ID or session ID required' },
        { status: 400 }
      );
    }

    let cartQuery;
    let params;

    if (userId) {
      cartQuery = `
        SELECT ci.id, ci.quantity, ci.created_at,
               p.id as product_id, p.name, p.slug, p.price, p.stock_quantity,
               COALESCE(pi.image_url, '') as image_url,
               pv.id as variant_id, pv.name as variant_name, pv.price as variant_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
        LEFT JOIN product_variants pv ON ci.product_variant_id = pv.id
        WHERE ci.user_id = $1 AND p.is_active = true
        ORDER BY ci.created_at DESC
      `;
      params = [userId];
    } else {
      cartQuery = `
        SELECT ci.id, ci.quantity, ci.created_at,
               p.id as product_id, p.name, p.slug, p.price, p.stock_quantity,
               COALESCE(pi.image_url, '') as image_url,
               pv.id as variant_id, pv.name as variant_name, pv.price as variant_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
        LEFT JOIN product_variants pv ON ci.product_variant_id = pv.id
        WHERE ci.session_id = $1 AND p.is_active = true
        ORDER BY ci.created_at DESC
      `;
      params = [sessionId];
    }

    const cartItems = await getRows(cartQuery, params);

    // Calculate totals
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => {
      const price = item.variant_price || item.price;
      return sum + (price * item.quantity);
    }, 0);

    return NextResponse.json({
      items: cartItems,
      totalItems,
      totalPrice
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, sessionId, productId, variantId, quantity = 1 } = body;

    if (!productId || (!userId && !sessionId)) {
      return NextResponse.json(
        { error: 'Product ID and user ID or session ID required' },
        { status: 400 }
      );
    }

    // Check if product exists and is active
    const productQuery = `
      SELECT id, name, price, stock_quantity 
      FROM products 
      WHERE id = $1 AND is_active = true
    `;
    const product = await getRow(productQuery, [productId]);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check stock availability
    if (product.stock_quantity < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Add to cart using transaction
    const result = await transaction(async (client) => {
      let insertQuery;
      let params;

      if (userId) {
        insertQuery = `
          INSERT INTO cart_items (user_id, product_id, product_variant_id, quantity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, product_id, product_variant_id) 
          DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
          RETURNING id, quantity
        `;
        params = [userId, productId, variantId || null, quantity];
      } else {
        insertQuery = `
          INSERT INTO cart_items (session_id, product_id, product_variant_id, quantity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (session_id, product_id, product_variant_id) 
          DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
          RETURNING id, quantity
        `;
        params = [sessionId, productId, variantId || null, quantity];
      }

      const result = await client.query(insertQuery, params);
      return result.rows[0];
    });

    return NextResponse.json({
      success: true,
      cartItemId: result.id,
      quantity: result.quantity
    });

  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

// PUT /api/cart - Update cart item quantity
export async function PUT(request) {
  try {
    const body = await request.json();
    const { cartItemId, quantity, userId, sessionId } = body;

    if (!cartItemId || quantity === undefined || (!userId && !sessionId)) {
      return NextResponse.json(
        { error: 'Cart item ID, quantity, and user ID or session ID required' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      const deleteQuery = `
        DELETE FROM cart_items 
        WHERE id = $1 AND (user_id = $2 OR session_id = $3)
      `;
      await query(deleteQuery, [cartItemId, userId, sessionId]);

      return NextResponse.json({
        success: true,
        message: 'Item removed from cart'
      });
    }

    // Update quantity
    const updateQuery = `
      UPDATE cart_items 
      SET quantity = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND (user_id = $3 OR session_id = $4)
      RETURNING id, quantity
    `;

    const result = await getRow(updateQuery, [quantity, cartItemId, userId, sessionId]);

    if (!result) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cartItemId: result.id,
      quantity: result.quantity
    });

  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Remove item from cart
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('cartItemId');
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!cartItemId || (!userId && !sessionId)) {
      return NextResponse.json(
        { error: 'Cart item ID and user ID or session ID required' },
        { status: 400 }
      );
    }

    const deleteQuery = `
      DELETE FROM cart_items 
      WHERE id = $1 AND (user_id = $2 OR session_id = $3)
    `;

    const result = await query(deleteQuery, [cartItemId, userId, sessionId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart'
    });

  } catch (error) {
    console.error('Error removing from cart:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from cart' },
      { status: 500 }
    );
  }
} 