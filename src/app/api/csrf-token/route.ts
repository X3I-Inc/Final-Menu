import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Generate a new CSRF token
    const tokenLength = 32;
    const randomToken = randomBytes(tokenLength).toString('hex');
    const timestamp = Date.now();
    const expiresAt = timestamp + (24 * 60 * 60 * 1000); // 24 hours
    
    // Create a signed token with expiration
    const data = `${randomToken}.${expiresAt}`;
    const signature = createHmac('sha256', process.env.CSRF_SECRET_KEY || 'default-csrf-secret-key-change-in-production')
      .update(data)
      .digest('hex');
    
    const csrfToken = `${data}.${signature}`;

    // Create response with the token in JSON body
    const response = NextResponse.json({ 
      token: csrfToken,
      expiresAt: expiresAt
    });

    // Set the same token as an HttpOnly cookie
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
} 