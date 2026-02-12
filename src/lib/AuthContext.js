'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { isTokenExpired, shouldRefreshToken } from './auth-client';

const AuthContext = createContext();

function hasUserChanges(currentUser, nextUser) {
  if (!currentUser || !nextUser) return false;
  const keysToCheck = [
    'id',
    'email',
    'first_name',
    'last_name',
    'phone',
    'role',
    'is_admin',
    'is_active',
    'is_verified',
    'updated_at'
  ];

  return keysToCheck.some((key) => currentUser[key] !== nextUser[key]);
}

// Auth reducer to manage authentication state
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'UPDATE_USER':
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    default:
      return state;
  }
}

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const userRef = useRef(state.user);

  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

  // Logout function
  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Token refresh function
  const refreshToken = useCallback(async () => {
    if (!state.token) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Token refresh failed, logout user
        logout();
        return false;
      }

      const data = await response.json();
      dispatch({ 
        type: 'LOGIN', 
        payload: { user: data.user, token: data.token } 
      });
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      logout();
      return false;
    }
  }, [state.token, logout]);

  // Validate token with server
  const validateTokenWithServer = useCallback(async (token) => {
    console.log('🔍 Validating token with server...');
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📋 Server validation response:', {
        status: response.status,
        valid: data.valid,
        error: data.error
      });
      return {
        valid: Boolean(data.valid),
        user: data.user || null
      };
    } catch (error) {
      console.error('❌ Error validating token with server:', error);
      return {
        valid: false,
        user: null
      };
    }
  }, []);

  // Check token expiration and refresh if needed
  const checkTokenExpiration = useCallback(async () => {
    if (!state.token) return;

    // If token is expired, logout immediately
    if (isTokenExpired(state.token)) {
      console.log('Token expired, logging out user');
      logout();
      return;
    }

    // Validate token with server
    const validationResult = await validateTokenWithServer(state.token);
    if (!validationResult.valid) {
      console.log('Token invalid on server, logging out user');
      logout();
      return;
    }

    if (validationResult.user && hasUserChanges(userRef.current, validationResult.user)) {
      dispatch({
        type: 'UPDATE_USER',
        payload: validationResult.user
      });
    }

    // If token should be refreshed (expires within 24 hours), refresh it
    if (shouldRefreshToken(state.token)) {
      console.log('Token expiring soon, refreshing...');
      await refreshToken();
    }
  }, [state.token, logout, refreshToken, validateTokenWithServer]);

  // Load auth state from localStorage on initialization
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const userString = localStorage.getItem('auth_user');
      
      if (token && userString) {
        try {
          // Check if token is expired before loading
          if (isTokenExpired(token)) {
            console.log('Stored token is expired, clearing auth state');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          // Validate token with server
          const validationResult = await validateTokenWithServer(token);
          if (!validationResult.valid) {
            console.log('Stored token is invalid on server, clearing auth state');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }

          const localUser = JSON.parse(userString);
          const user = validationResult.user || localUser;
          dispatch({ 
            type: 'LOGIN', 
            payload: { user, token } 
          });
        } catch (error) {
          console.error('Error loading auth state:', error);
          // Clear corrupted data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, [validateTokenWithServer]);

  // Check token expiration on mount and when token changes
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      checkTokenExpiration();
    }
  }, [state.isAuthenticated, state.token, checkTokenExpiration]);

  // Force immediate token validation (useful for debugging)
  const forceTokenValidation = useCallback(async () => {
    console.log('Forcing token validation...');
    await checkTokenExpiration();
  }, [checkTokenExpiration]);

  // Set up interval to check token expiration every 5 minutes
  useEffect(() => {
    let interval;
    
    if (state.isAuthenticated && state.token) {
      console.log('Setting up token validation interval');
      interval = setInterval(() => {
        console.log('Periodic token validation check');
        checkTokenExpiration();
      }, 5 * 60 * 1000); // Check every 5 minutes
    }

    return () => {
      if (interval) {
        console.log('Clearing token validation interval');
        clearInterval(interval);
      }
    };
  }, [state.isAuthenticated, state.token, checkTokenExpiration]);

  // Save auth state to localStorage when it changes
  useEffect(() => {
    if (state.isAuthenticated && state.token && state.user) {
      localStorage.setItem('auth_token', state.token);
      localStorage.setItem('auth_user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }, [state.isAuthenticated, state.token, state.user]);

  // Auth functions
  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      dispatch({ 
        type: 'LOGIN', 
        payload: { user: data.user, token: data.token } 
      });

      return { success: true, message: data.message };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      dispatch({ 
        type: 'LOGIN', 
        payload: { user: data.user, token: data.token } 
      });

      return { success: true, message: data.message };
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: false, error: error.message };
    }
  };



  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  // Helper function to make authenticated API requests with automatic token refresh
  const apiRequest = useCallback(async (url, options = {}) => {
    // Check token expiration before making the request
    if (state.token && isTokenExpired(state.token)) {
      console.log('Token expired before API request, logging out');
      logout();
      throw new Error('Token expired');
    }

    // Skip server validation for frequent requests to avoid performance issues
    // The token will be validated by the API endpoint itself

    // Try to refresh token if it's expiring soon
    if (state.token && shouldRefreshToken(state.token)) {
      console.log('Token expiring soon, refreshing before API request');
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        throw new Error('Token refresh failed');
      }
    }

    const headers = {
      ...options.headers,
    };

    // Only set Content-Type for JSON requests, not for FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If we get a 401, try to refresh the token once
    if (response.status === 401 && state.token) {
      console.log('Received 401, attempting token refresh');
      const refreshSuccess = await refreshToken();
      
      if (refreshSuccess) {
        // Retry the request with the new token
        headers.Authorization = `Bearer ${state.token}`;
        return fetch(url, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed, logout
        console.log('Token refresh failed after 401, logging out');
        logout();
        throw new Error('Authentication failed');
      }
    }

    return response;
  }, [state.token, logout, refreshToken]);

  const value = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    logout,
    updateUser,
    apiRequest,
    refreshToken,
    checkTokenExpiration,
    validateTokenWithServer,
    forceTokenValidation
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
