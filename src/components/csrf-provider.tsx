"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CSRFProtection, clientCSRF } from '@/lib/csrf';

interface CSRFContextType {
  token: string | null;
  refreshToken: () => void;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const refreshToken = () => {
    const newToken = CSRFProtection.generateToken();
    setToken(newToken);
    clientCSRF.setToken(newToken);
  };

  useEffect(() => {
    // Try to get existing token from localStorage
    const existingToken = clientCSRF.getToken();
    
    if (existingToken && CSRFProtection.validateToken(existingToken)) {
      setToken(existingToken);
    } else {
      // Generate new token if none exists or current one is invalid
      refreshToken();
    }

    // Set up token refresh interval (refresh every 12 hours)
    const interval = setInterval(() => {
      const currentToken = clientCSRF.getToken();
      if (currentToken && CSRFProtection.isTokenExpiringSoon(currentToken)) {
        refreshToken();
      }
    }, 12 * 60 * 60 * 1000); // 12 hours

    return () => clearInterval(interval);
  }, []);

  return (
    <CSRFContext.Provider value={{ token, refreshToken }}>
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