'use client';

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const CartContext = createContext();

// Reducer para manejar las acciones del carrito
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }]
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload.id)
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item
        ).filter(item => item.quantity > 0)
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      };

    case 'LOAD_CART':
      return {
        ...state,
        items: action.payload || []
      };

    default:
      return state;
  }
}

// Estado inicial del carrito
const initialState = {
  items: []
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Cargar carrito desde localStorage al inicializar
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: cartData });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.items));
  }, [state.items]);

  // Funciones del carrito
  const addToCart = (product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
  };

  const removeFromCart = (productId) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: { id: productId } });
  };

  const updateQuantity = (productId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  // Calcular totales
  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Sync cart with database (for authenticated users)
  const syncCartWithDatabase = useCallback(async (user, apiRequest) => {
    if (!user || !apiRequest) return;

    try {
      // Get current cart from localStorage
      const localCart = state.items;
      
      if (localCart.length > 0) {
        // Clear existing cart in database first to avoid duplicates
        await apiRequest('/api/cart', {
          method: 'DELETE',
          body: JSON.stringify({
            clearAll: true,
            userId: user.id
          })
        });

        // Sync local cart items to database
        for (const item of localCart) {
          try {
            await apiRequest('/api/cart', {
              method: 'POST',
              body: JSON.stringify({
                productId: item.id,
                quantity: item.quantity,
                variantId: item.variantId || null,
                userId: user.id
              })
            });
          } catch (itemError) {
            console.error(`Error syncing item ${item.id}:`, itemError);
            // Continue with other items even if one fails
          }
        }
        
        // Clear local cart after syncing
        localStorage.removeItem('cart');
      }

      // Load cart from database
      const response = await apiRequest(`/api/cart?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const dbCartItems = data.items.map(item => ({
          id: item.product_id,
          name: item.name,
          price: item.variant_price || item.price,
          quantity: item.quantity,
          image: item.image_url,
          variantId: item.variant_id
        }));
        
        dispatch({ type: 'LOAD_CART', payload: dbCartItems });
      }
    } catch (error) {
      console.error('Error syncing cart:', error);
    }
  }, [state.items]);

  // Add item to cart with database sync
  const addToCartWithSync = useCallback(async (product, user, apiRequest, quantity = 1) => {
    if (user && apiRequest) {
      try {
        const response = await apiRequest('/api/cart', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            quantity: quantity,
            variantId: product.variantId || null,
            userId: user.id
          })
        });
        
        if (response.ok) {
          // Update local state with correct quantity
          for (let i = 0; i < quantity; i++) {
            addToCart(product);
          }
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        // Fallback to local storage
        for (let i = 0; i < quantity; i++) {
          addToCart(product);
        }
      }
    } else {
      // Guest user - use local storage
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
    }
  }, []);

  // Remove item from cart with database sync
  const removeFromCartWithSync = useCallback(async (productId, user, apiRequest) => {
    if (user && apiRequest) {
      try {
        // First find the cart item by product ID
        const cartResponse = await apiRequest(`/api/cart?userId=${user.id}`);
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          const cartItem = cartData.items.find(item => item.product_id === productId);
          
          if (cartItem) {
            const response = await apiRequest(`/api/cart?cartItemId=${cartItem.id}&userId=${user.id}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              // Only update local state if API call was successful
              removeFromCart(productId);
            } else {
              console.error('Failed to remove from database, keeping local item');
            }
          } else {
            // Item not found in database, remove from local storage anyway
            removeFromCart(productId);
          }
        } else {
          // Can't fetch cart, remove from local storage anyway
          removeFromCart(productId);
        }
      } catch (error) {
        console.error('Error removing from cart:', error);
        // Fallback to local storage
        removeFromCart(productId);
      }
    } else {
      // Guest user - use local storage
      removeFromCart(productId);
    }
  }, []);

  // Update quantity with database sync
  const updateQuantityWithSync = useCallback(async (productId, quantity, user, apiRequest) => {
    if (user && apiRequest) {
      try {
        // First find the cart item by product ID
        const cartResponse = await apiRequest(`/api/cart?userId=${user.id}`);
        if (cartResponse.ok) {
          const cartData = await cartResponse.json();
          const cartItem = cartData.items.find(item => item.product_id === productId);
          
          if (cartItem) {
            const response = await apiRequest('/api/cart', {
              method: 'PUT',
              body: JSON.stringify({ 
                cartItemId: cartItem.id, 
                quantity, 
                userId: user.id 
              })
            });
            
            if (response.ok) {
              updateQuantity(productId, quantity);
            } else {
              console.error('Failed to update quantity in database');
            }
          } else {
            // Item not found in database, update local anyway
            updateQuantity(productId, quantity);
          }
        } else {
          // Can't fetch cart, update local anyway
          updateQuantity(productId, quantity);
        }
      } catch (error) {
        console.error('Error updating quantity:', error);
        // Fallback to local storage
        updateQuantity(productId, quantity);
      }
    } else {
      // Guest user - use local storage
      updateQuantity(productId, quantity);
    }
  }, []);

  const value = {
    items: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    syncCartWithDatabase,
    addToCartWithSync,
    removeFromCartWithSync,
    updateQuantityWithSync
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 