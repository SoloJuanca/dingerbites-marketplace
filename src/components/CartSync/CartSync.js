'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useCart } from '../../lib/CartContext';

// This component handles cart synchronization when user authentication state changes
export default function CartSync() {
  const { user, isAuthenticated, apiRequest } = useAuth();
  const { syncCartWithDatabase } = useCart();
  const hasSync = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user && apiRequest && !hasSync.current) {
      // Sync cart only once when user logs in
      syncCartWithDatabase(user, apiRequest);
      hasSync.current = true;
    }
    
    // Reset when user logs out
    if (!isAuthenticated) {
      hasSync.current = false;
    }
  }, [isAuthenticated, user?.id]); // Only depend on auth state and user ID

  // This component doesn't render anything
  return null;
}
