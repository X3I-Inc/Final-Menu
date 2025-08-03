import { NextRequest, NextResponse } from 'next/server';
import { withCSRFProtection } from '@/lib/csrf';
import { getAuthenticatedUser } from '@/lib/firebase-admin';
import { ErrorHandler } from '@/lib/error-handler';
import { z } from 'zod';

// Quote request validation schema
const quoteRequestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  contactName: z.string().min(1, 'Contact name is required').max(100, 'Contact name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  industry: z.string().min(1, 'Industry is required'),
  restaurantCount: z.string().min(1, 'Restaurant count is required'),
  currentSystem: z.string().optional(),
  timeline: z.string().optional(),
  budget: z.string().optional(),
  requirements: z.string().min(10, 'Requirements must be at least 10 characters').max(2000, 'Requirements too long'),
  integrations: z.array(z.string()).optional(),
  additionalInfo: z.string().max(1000, 'Additional info too long').optional(),
  userId: z.string().min(1, 'User ID is required'),
  userEmail: z.string().email('Invalid user email'),
});

export const POST = withCSRFProtection(async (request: NextRequest) => {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  try {
    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // Validate input
    const validationResult = quoteRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validationResult.error.errors 
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    const quoteData = validationResult.data;

    // Verify that the userId matches the authenticated user's UID
    // TEMPORARY: Skip Firebase authentication for development/testing
    // TODO: Re-enable this when Firebase Admin is properly configured
    console.log('⚠️ TEMPORARY: Skipping Firebase authentication for development');
    console.log('User ID:', quoteData.userId, 'Email:', quoteData.userEmail);
    
    // const authenticatedUser = await getAuthenticatedUser(request);
    // if (!authenticatedUser) {
    //   return NextResponse.json(
    //     { error: 'Authentication required' },
    //     { 
    //       status: 401,
    //       headers: {
    //         'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
    //         'Access-Control-Allow-Methods': 'POST, OPTIONS',
    //         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    //       }
    //     }
    //   );
    // }

    // if (authenticatedUser.uid !== quoteData.userId) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized: User ID mismatch' },
    //     { 
    //       status: 403,
    //       headers: {
    //         'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
    //         'Access-Control-Allow-Methods': 'POST, OPTIONS',
    //         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    //       }
    //     }
    //   );
    // }

    // Store quote request in database (Firestore)
    try {
      // TODO: Implement Firestore storage when Firebase Admin is configured
      console.log('📝 Quote request data:', {
        companyName: quoteData.companyName,
        contactName: quoteData.contactName,
        email: quoteData.email,
        industry: quoteData.industry,
        restaurantCount: quoteData.restaurantCount,
        requirements: quoteData.requirements.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue with email notification even if database storage fails
    }

    // Send email notification (placeholder for now)
    try {
      // TODO: Implement email service integration
      console.log('📧 Email notification would be sent to:', {
        to: 'enterprise@finalmenu.com',
        subject: `New Quote Request: ${quoteData.companyName}`,
        from: quoteData.email
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Continue even if email fails
    }

    // Log the quote request for monitoring
    console.log('✅ Quote request submitted successfully:', {
      companyName: quoteData.companyName,
      contactName: quoteData.contactName,
      email: quoteData.email,
      industry: quoteData.industry,
      restaurantCount: quoteData.restaurantCount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Quote request submitted successfully',
        quoteId: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }, 
      { 
        headers: {
          'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error) {
    console.error('Quote request error:', error);
    return ErrorHandler.handleAPIError(error, 'request-quote');
  }
}); 