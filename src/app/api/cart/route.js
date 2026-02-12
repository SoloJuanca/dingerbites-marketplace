import { NextResponse } from 'next/server';
import {
  getCartItems,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart
} from '../../../lib/firebaseCart';

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

    const { items, totalItems, totalPrice } = await getCartItems(userId, sessionId);
    return NextResponse.json({
      items,
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

    const result = await addCartItem({
      userId,
      sessionId,
      productId,
      variantId,
      quantity
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Product not found or insufficient stock' },
        { status: 404 }
      );
    }

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
      const removed = await removeCartItem(cartItemId, userId, sessionId);
      if (!removed) {
        return NextResponse.json(
          { error: 'Cart item not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Item removed from cart'
      });
    }

    const result = await updateCartItemQuantity(cartItemId, quantity, userId, sessionId);
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

// DELETE /api/cart - Remove item or clear entire cart
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('cartItemId');
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    let body = null;
    try {
      body = await request.json();
    } catch (e) {}

    if (body?.clearAll) {
      if (!body.userId && !sessionId) {
        return NextResponse.json(
          { error: 'User ID or session ID required to clear cart' },
          { status: 400 }
        );
      }
      await clearCart(body.userId, sessionId);
      return NextResponse.json({
        success: true,
        message: 'Cart cleared successfully'
      });
    }

    if (!cartItemId || (!userId && !sessionId)) {
      return NextResponse.json(
        { error: 'Cart item ID and user ID or session ID required' },
        { status: 400 }
      );
    }

    const removed = await removeCartItem(cartItemId, userId, sessionId);
    if (!removed) {
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
