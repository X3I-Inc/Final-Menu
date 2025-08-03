import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Additional Security Headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob: https://placehold.co https://firebasestorage.googleapis.com",
      "connect-src 'self' https://api.stripe.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com",
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  );

  // Rate limiting headers (basic implementation)
  const clientIp = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown';
  
  // Add rate limiting info to headers
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99'); // This would be calculated in a real implementation
  response.headers.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + 3600).toString());

  // Security monitoring
  if (process.env.NODE_ENV === 'production') {
    // Log suspicious requests
    const userAgent = request.headers.get('user-agent') || '';
    const isSuspicious = userAgent.toLowerCase().includes('bot') || 
                        userAgent.toLowerCase().includes('crawler') ||
                        userAgent.toLowerCase().includes('scraper');
    
    if (isSuspicious) {
      console.warn('🔒 Suspicious request detected:', {
        ip: clientIp,
        userAgent,
        url: request.url,
        method: request.method,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 