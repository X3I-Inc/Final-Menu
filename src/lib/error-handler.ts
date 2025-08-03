import { NextResponse } from 'next/server';
import { securityMonitor } from './security-monitor';

export interface APIError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

export class ErrorHandler {
  static handleAPIError(error: unknown, context: string = 'API'): NextResponse {
    let apiError: APIError;

    // Handle different types of errors
    if (error instanceof Error) {
      // Stripe errors
      if (error.message.includes('Stripe')) {
        apiError = {
          message: 'Payment processing error',
          code: 'PAYMENT_ERROR',
          status: 400,
          details: { originalError: error.message }
        };
      }
      // Firebase errors
      else if (error.message.includes('Firebase') || error.message.includes('Firestore')) {
        apiError = {
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
          status: 500,
          details: { originalError: error.message }
        };
      }
      // Authentication errors
      else if (error.message.includes('auth') || error.message.includes('token')) {
        apiError = {
          message: 'Authentication failed',
          code: 'AUTH_ERROR',
          status: 401,
          details: { originalError: error.message }
        };
      }
      // Validation errors
      else if (error.message.includes('validation') || error.message.includes('Invalid')) {
        apiError = {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: { originalError: error.message }
        };
      }
      // Rate limiting errors
      else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        apiError = {
          message: 'Too many requests',
          code: 'RATE_LIMIT_ERROR',
          status: 429,
          details: { originalError: error.message }
        };
      }
      // Generic errors
      else {
        apiError = {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          status: 500,
          details: { originalError: error.message }
        };
      }
    } else {
      // Unknown error type
      apiError = {
        message: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
        status: 500,
        details: { error: String(error) }
      };
    }

    // Log the error for monitoring
    this.logError(apiError, context, error);

    // Return standardized error response
    return NextResponse.json(
      {
        error: apiError.message,
        code: apiError.code,
        ...(process.env.NODE_ENV === 'development' && { details: apiError.details })
      },
      { 
        status: apiError.status,
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }

  private static logError(apiError: APIError, context: string, originalError: unknown): void {
    // Log to security monitor
    securityMonitor.logEvent({
      type: 'api_error',
      severity: apiError.status >= 500 ? 'high' : 'medium',
      message: `API Error in ${context}: ${apiError.message}`,
      details: {
        code: apiError.code,
        status: apiError.status,
        context,
        originalError: originalError instanceof Error ? originalError.message : String(originalError),
        stack: originalError instanceof Error ? originalError.stack : undefined,
      }
    });

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 API Error in ${context}:`, {
        message: apiError.message,
        code: apiError.code,
        status: apiError.status,
        details: apiError.details,
        originalError: originalError instanceof Error ? originalError.stack : originalError,
      });
    }
  }

  // Helper method for specific error types
  static createError(message: string, code: string, status: number, details?: Record<string, unknown>): APIError {
    return { message, code, status, details };
  }

  // Common error creators
  static unauthorized(message: string = 'Authentication required'): APIError {
    return this.createError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message: string = 'Access denied'): APIError {
    return this.createError(message, 'FORBIDDEN', 403);
  }

  static notFound(message: string = 'Resource not found'): APIError {
    return this.createError(message, 'NOT_FOUND', 404);
  }

  static validationError(message: string = 'Invalid request data', details?: Record<string, unknown>): APIError {
    return this.createError(message, 'VALIDATION_ERROR', 400, details);
  }

  static internalError(message: string = 'Internal server error'): APIError {
    return this.createError(message, 'INTERNAL_ERROR', 500);
  }
} 