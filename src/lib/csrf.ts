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
   * Refresh a CSRF token
   */
  static refreshToken(): string {
    return this.generateToken();
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
   * Extract token from request body
   */
  static extractTokenFromBody(body: Record<string, unknown>): string | null {
    if (!body) return null;
    
    const csrfToken = body.csrfToken || body._csrf || body.csrf_token;
    return typeof csrfToken === 'string' ? csrfToken : null;
  }

  /**
   * Validate CSRF token from request
   */
  static validateRequest(request: Request): boolean {
    const token = this.extractTokenFromHeaders(request.headers);
    return token ? this.validateToken(token) : false;
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

// Middleware helper for Next.js API routes
export function withCSRFProtection(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    // Skip CSRF validation for GET requests
    if (request.method === 'GET') {
      return handler(request);
    }

    // For POST requests, we need to clone the request to read the body
    let token = CSRFProtection.extractTokenFromHeaders(request.headers);
    
    // If no token in headers, try to get it from body
    if (!token && request.method === 'POST') {
      try {
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();
        token = CSRFProtection.extractTokenFromBody(body);
      } catch (error) {
        // If we can't parse the body, just continue with header token
      }
    }

    // Validate CSRF token for state-changing requests
    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing CSRF token',
          code: 'CSRF_TOKEN_MISSING'
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!CSRFProtection.validateToken(token)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid CSRF token',
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
   * Get CSRF token from meta tag or generate new one
   */
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    // Try to get from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }

    // Try to get from localStorage
    const storedToken = localStorage.getItem('csrf-token');
    if (storedToken && CSRFProtection.validateToken(storedToken)) {
      return storedToken;
    }

    return null;
  },

  /**
   * Set CSRF token in localStorage
   */
  setToken(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('csrf-token', token);
  },

  /**
   * Clear CSRF token
   */
  clearToken(): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('csrf-token');
  },

  /**
   * Add CSRF token to fetch request
   */
  async fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    
    const headers = {
      ...options.headers,
      ...(token && { 'X-CSRF-Token': token }),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}; 