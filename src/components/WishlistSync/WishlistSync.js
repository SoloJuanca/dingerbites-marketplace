'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useWishlist } from '../../lib/WishlistContext';

// This component handles wishlist synchronization when user authentication state changes
export default function WishlistSync() {
  const { user, isAuthenticated, apiRequest } = useAuth();
  const { loadWishlist } = useWishlist();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user && apiRequest && !hasLoaded.current) {
      // Load wishlist only once when user logs in
      loadWishlist(user, apiRequest);
      hasLoaded.current = true;
    }
    
    // Reset when user logs out
    if (!isAuthenticated) {
      hasLoaded.current = false;
    }
  }, [isAuthenticated, user?.id]); // Only depend on auth state and user ID

  // This component doesn't render anything
  return null;
}
