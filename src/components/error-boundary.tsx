"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private async logErrorToService(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        errorType: 'react_boundary',
      };

      // Option 1: Sentry integration
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // This would require @sentry/nextjs package
        // Sentry.captureException(error, {
        //   tags: { type: 'react_boundary' },
        //   extra: { errorInfo, errorData }
        // });
      }
      
      // Option 2: Custom error logging endpoint
      if (process.env.NEXT_PUBLIC_ERROR_LOGGING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ERROR_LOGGING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData),
        });
      }
      
      // Option 3: LogRocket integration
      if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
        // This would require logrocket package
        // LogRocket.captureException(error, {
        //   tags: { type: 'react_boundary' },
        //   extra: { errorInfo, errorData }
        // });
      }
      
      // Fallback: Enhanced console logging
      console.error('🚨 React Error Boundary:', errorData);
      
    } catch (loggingError) {
      // If all logging methods fail, at least log to console
      console.error('🚨 React Error Boundary (fallback):', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        loggingError: loggingError instanceof Error ? loggingError.message : 'Unknown error',
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Refresh Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-muted rounded-lg">
                <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                <pre className="mt-2 text-sm text-muted-foreground overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function useErrorHandler() {
  return async (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Error caught by hook:', error, errorInfo);
    
    if (process.env.NODE_ENV === 'production') {
      await logErrorToService(error, errorInfo);
    }
  };
}

// Standalone error logging function
async function logErrorToService(error: Error, errorInfo?: ErrorInfo) {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      errorType: 'react_hook',
    };

    // Option 1: Sentry integration
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // This would require @sentry/nextjs package
      // Sentry.captureException(error, {
      //   tags: { type: 'react_hook' },
      //   extra: { errorInfo, errorData }
      // });
    }
    
    // Option 2: Custom error logging endpoint
    if (process.env.NEXT_PUBLIC_ERROR_LOGGING_ENDPOINT) {
      await fetch(process.env.NEXT_PUBLIC_ERROR_LOGGING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
    }
    
    // Option 3: LogRocket integration
    if (process.env.NEXT_PUBLIC_LOGROCKET_APP_ID) {
      // This would require logrocket package
      // LogRocket.captureException(error, {
      //   tags: { type: 'react_hook' },
      //   extra: { errorInfo, errorData }
      // });
    }
    
    // Fallback: Enhanced console logging
    console.error('🚨 React Hook Error:', errorData);
    
  } catch (loggingError) {
    // If all logging methods fail, at least log to console
    console.error('🚨 React Hook Error (fallback):', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      loggingError: loggingError instanceof Error ? loggingError.message : 'Unknown error',
    });
  }
} 