// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const isGoogleAuth = localStorage.getItem('isGoogleAuth');

      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/user/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogleAuth && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        // If token verification fails, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('isGoogleAuth');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('isGoogleAuth');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token, isGoogle = false) => {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('isGoogleAuth', isGoogle.toString());
      
      const response = await fetch('/api/user/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogle && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        throw new Error('Token verification failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('isGoogleAuth');
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isGoogleAuth');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
