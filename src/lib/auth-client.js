// Client-side authentication utilities
// This file contains only functions that can be used in the browser

// Client-side token utilities
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    // Decode token without verification (we just need the expiration)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const decoded = JSON.parse(jsonPayload);
    const currentTime = Date.now() / 1000;
    
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
}

export function getTokenExpirationTime(token) {
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const decoded = JSON.parse(jsonPayload);
    return decoded.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export function shouldRefreshToken(token) {
  if (!token) return false;
  
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return false;
  
  const currentTime = Date.now();
  const timeUntilExpiry = expirationTime - currentTime;
  
  // Refresh token if it expires within 24 hours
  return timeUntilExpiry < 24 * 60 * 60 * 1000;
}

// Get token payload (client-side only, no verification)
export function getTokenPayload(token) {
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token payload:', error);
    return null;
  }
}
