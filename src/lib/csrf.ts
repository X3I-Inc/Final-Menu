import { randomBytes, createHmac } from 'crypto';
import type { NextRequest } from 'next/server';

export interface CSRFToken {
  token: string;
  expiresAt: number;
}

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly SECRET_KEY = process.env.CSRF_SECRET_KEY ?? 'default-csrf-secret-key-change-in-production';

  /**
   * Generate a new CSRF token
   */
  static generateToken(): string {
    const randomToken = randomBytes(this.TOKEN_LENGTH).toString('hex');
    const timestamp = Date.now();
    const expiresAt = timestamp + this.TOKEN_EXPIRY;
    
    // Create a signed token with expiration
    const data = `${randomToken}.${expiresAt}`;
    const signature = createHmac('sha256', this.SECRET_KEY)
      .update(data)
      .digest('hex');
    
    return `${data}.${signature}`;
  }

  /**
   * Validate a CSRF token
   */
  static validateToken(token: string): boolean {
    try {
      if (!token || typeof token !== 'string') {
        return false;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      const [randomToken, expiresAt, signature] = parts;
      if (!expiresAt || !signature) {
        return false;
      }
      
      const data = `${randomToken}.${expiresAt}`;
      
      // Verify signature
      const expectedSignature = createHmac('sha256', this.SECRET_KEY)
        .update(data)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return false;
      }

      // Check expiration
      const expiryTime = parseInt(expiresAt, 10);
      if (isNaN(expiryTime) || Date.now() > expiryTime) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }

  /**
   * Extract token from request headers
   */
  static extractTokenFromHeaders(headers: Headers): string | null {
    const token = headers.get('X-CSRF-Token') ?? 
                  headers.get('x-csrf-token') ?? 
                  headers.get('X-XSRF-TOKEN') ?? 
                  null;
    return token;
  }

  /**
   * Extract token from cookies
   */
  static extractTokenFromCookies(cookies: string): string | null {
    if (!cookies) return null;
    
    const cookiePairs = cookies.split(';');
    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split('=');
      if (name === 'csrf_token' && value) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Validate CSRF token using Double-Submit Cookie Pattern
   */
  static validateDoubleSubmitToken(headerToken: string | null, cookieToken: string | null): boolean {
    // Both tokens must be present
    if (!headerToken || !cookieToken) {
      return false;
    }

    // Both tokens must be identical
    if (headerToken !== cookieToken) {
      return false;
    }

    // Both tokens must be valid
    return this.validateToken(headerToken) && this.validateToken(cookieToken);
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const expiryPart = parts[1];
      if (!expiryPart) {
        return null;
      }
      const expiry = parseInt(expiryPart, 10);
      return isNaN(expiry) ? null : expiry;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is about to expire (within 1 hour)
   */
  static isTokenExpiringSoon(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) {
      return true;
    }
    
    const oneHour = 60 * 60 * 1000;
    return (expiry - Date.now()) < oneHour;
  }
}

// Middleware helper for Next.js API routes using Double-Submit Cookie Pattern
export function withCSRFProtection(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    // Skip CSRF validation for GET requests
    if (request.method === 'GET') {
      return handler(request);
    }

    // Extract token from request header
    const headerToken = CSRFProtection.extractTokenFromHeaders(request.headers);
    
    // Extract token from HttpOnly cookie
    const cookieToken = CSRFProtection.extractTokenFromCookies(request.headers.get('cookie') || '');

    // Validate using Double-Submit Cookie Pattern
    if (!CSRFProtection.validateDoubleSubmitToken(headerToken, cookieToken)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or missing CSRF token',
          code: 'CSRF_TOKEN_INVALID'
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request);
  };
}

// Client-side helper for React components
export const clientCSRF = {
  /**
   * Get CSRF token from server
   */
  async getToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Important: include cookies
      });

      if (!response.ok) {
        console.error('Failed to fetch CSRF token');
        return null;
      }

      const data = await response.json();
      return data.token || null;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      return null;
    }
  },

  /**
   * Add CSRF token to fetch request
   */
  async fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    
    const headers = {
      ...options.headers,
      ...(token && { 'X-CSRF-Token': token }),
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important: include cookies
    });
  }
};