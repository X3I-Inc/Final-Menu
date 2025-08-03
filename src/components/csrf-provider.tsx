"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { clientCSRF } from '@/lib/csrf';

interface CSRFContextType {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = async (): Promise<string | null> => {
    try {
      return await clientCSRF.getToken();
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      return null;
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newToken = await clientCSRF.getToken();
      setToken(newToken);
      
      if (!newToken) {
        setError('Failed to fetch CSRF token');
      }
    } catch (error) {
      console.error('Error refreshing CSRF token:', error);
      setError('Failed to refresh CSRF token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial token when component mounts
    refreshToken();

    // Set up token refresh interval (refresh every 12 hours)
    const interval = setInterval(() => {
      refreshToken();
    }, 12 * 60 * 60 * 1000); // 12 hours

    return () => clearInterval(interval);
  }, []);

  return (
    <CSRFContext.Provider value={{ 
      token, 
      isLoading, 
      error, 
      refreshToken, 
      getToken 
    }}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
} 