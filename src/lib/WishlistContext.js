'use client';

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const WishlistContext = createContext();

// Wishlist reducer to manage wishlist state
function wishlistReducer(state, action) {
  switch (action.type) {
    case 'LOAD_WISHLIST':
      return {
        ...state,
        items: action.payload || []
      };

    case 'ADD_TO_WISHLIST':
      const exists = state.items.find(item => item.id === action.payload.id);
      if (!exists) {
        return {
          ...state,
          items: [action.payload, ...state.items]
        };
      }
      return state;

    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload.id)
      };

    case 'CLEAR_WISHLIST':
      return {
        ...state,
        items: []
      };

    default:
      return state;
  }
}

// Initial state
const initialState = {
  items: []
};

export function WishlistProvider({ children }) {
  const [state, dispatch] = useReducer(wishlistReducer, initialState);

  // Wishlist functions
  const addToWishlist = useCallback((product) => {
    dispatch({ type: 'ADD_TO_WISHLIST', payload: product });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: { id: productId } });
  }, []);

  const clearWishlist = () => {
    dispatch({ type: 'CLEAR_WISHLIST' });
  };

  const isInWishlist = (productId) => {
    return state.items.some(item => item.id === productId);
  };

  const getTotalItems = () => {
    return state.items.length;
  };

  // Load wishlist from database (for authenticated users)
  const loadWishlist = useCallback(async (user, apiRequest) => {
    if (!user || !apiRequest) return;

    try {
      const response = await apiRequest('/api/wishlist');
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'LOAD_WISHLIST', payload: data.items });
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  }, []);

  // Add item to wishlist with database sync
  const addToWishlistWithSync = useCallback(async (product, user, apiRequest) => {
    if (user && apiRequest) {
      try {
        const response = await apiRequest('/api/wishlist', {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id
          })
        });
        
        if (response.ok) {
          addToWishlist(product);
          return { success: true };
        } else {
          const errorData = await response.json();
          return { success: false, error: errorData.error };
        }
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        return { success: false, error: 'Error adding to wishlist' };
      }
    } else {
      return { success: false, error: 'Authentication required' };
    }
  }, [addToWishlist]);

  // Remove item from wishlist with database sync
  const removeFromWishlistWithSync = useCallback(async (productId, user, apiRequest) => {
    if (user && apiRequest) {
      try {
        const response = await apiRequest(`/api/wishlist?productId=${productId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          removeFromWishlist(productId);
          return { success: true };
        } else {
          const errorData = await response.json();
          return { success: false, error: errorData.error };
        }
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        return { success: false, error: 'Error removing from wishlist' };
      }
    } else {
      return { success: false, error: 'Authentication required' };
    }
  }, [removeFromWishlist]);

  const value = {
    items: state.items,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    getTotalItems,
    loadWishlist,
    addToWishlistWithSync,
    removeFromWishlistWithSync
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
