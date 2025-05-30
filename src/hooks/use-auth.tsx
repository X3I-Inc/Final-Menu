
"use client";
import type { AuthContextType } from '@/context/auth-provider';
import { AuthContext } from '@/context/auth-provider';
import { useContext } from 'react';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
