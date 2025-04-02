// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isPowerUser, setIsPowerUser] = useState(false);

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
        setUser(null);
        setIsPowerUser(false);
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
        const data = await response.json();
        setIsAuthenticated(true);

        if (data.user) {
          setUser(data.user);
          // Check if the user is a power user
          setIsPowerUser(data.user.role === 'power_user');
        } else {
          // If the API doesn't return role yet, make an additional request to check power user status
          try {
            const powerUserResponse = await fetch('/api/user/check-power-user', {
              headers: {
                'Authorization': `Bearer ${token}`,
                ...(isGoogleAuth && { 'Auth-Type': 'google' }),
                'Content-Type': 'application/json'
              }
            });
            
            if (powerUserResponse.ok) {
              const powerUserData = await powerUserResponse.json();
              setIsPowerUser(powerUserData.isPowerUser);
            }
          } catch (powerUserError) {
            console.error('Power user check failed:', powerUserError);
            setIsPowerUser(false);
          }
        }

      } else {
        // If token verification fails, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('isGoogleAuth');
        setIsAuthenticated(false);
        setUser(null);
        setIsPowerUser(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('isGoogleAuth');
      setIsAuthenticated(false);
      setUser(null);
      setIsPowerUser(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token, isGoogle = false) => {
    try {
      localStorage.setItem('authToken', token);
      if (isGoogle) {
        localStorage.setItem('isGoogleAuth', 'true');
      } else {
        localStorage.removeItem('isGoogleAuth'); // Remove it completely for regular login
      }

      const response = await fetch('/api/user/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogle && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);

        if (data.user) {
          setUser(data.user);
          setIsPowerUser(data.user.role === 'power_user');
        } else {
          // Additional power user check
          await checkPowerUserStatus(token, isGoogle);
        }

      } else {
        throw new Error('Token verification failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('isGoogleAuth');
      setIsAuthenticated(false);
      setUser(null);
      setIsPowerUser(false);
      throw error;
    }
  };

  const checkPowerUserStatus = async (token, isGoogle) => {
    try {
      const response = await fetch('/api/user/check-power-user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(isGoogle && { 'Auth-Type': 'google' }),
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsPowerUser(data.isPowerUser);
      } else {
        setIsPowerUser(false);
      }
    } catch (error) {
      console.error('Power user check failed:', error);
      setIsPowerUser(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isGoogleAuth');
    setIsAuthenticated(false);
    setUser(null);
    setIsPowerUser(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, checkAuth, user, isPowerUser }}>
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
