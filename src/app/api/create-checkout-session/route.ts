import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { subscriptionTiers } from '@/lib/subscription-config';
import { validateSubscriptionRequest, RateLimiter } from '@/lib/validation';
import { withCSRFProtection } from '@/lib/csrf';
import { getAuthenticatedUser } from '@/lib/firebase-admin';
import { ErrorHandler } from '@/lib/error-handler';

// Initialize rate limiter
const rateLimiter = new RateLimiter(60000, 10); // 10 requests per minute

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
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    if (!rateLimiter.isAllowed(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

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
    const validationResult = validateSubscriptionRequest(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
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

    const { tier, billingInterval, userId, userEmail } = validationResult.data;

    // TEMPORARY: Skip Firebase authentication for development/testing
    // TODO: Re-enable this when Firebase Admin is properly configured
    console.log('⚠️ TEMPORARY: Skipping Firebase authentication for development');
    console.log('User ID:', userId, 'Email:', userEmail);
    
    // Verify that the userId matches the authenticated user's UID
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

    // if (authenticatedUser.uid !== userId) {
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

    // Validate tier and billing interval
    if (!subscriptionTiers[tier as keyof typeof subscriptionTiers]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
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

    if (billingInterval !== 'monthly' && billingInterval !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid billing interval' },
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

    // Get the price ID for the selected tier and billing interval
    const tierConfig = subscriptionTiers[tier as keyof typeof subscriptionTiers];
    const billingConfig = tierConfig[billingInterval as 'monthly' | 'yearly'];
    const priceId = billingConfig.priceId;

    // Debug logging
    console.log('🔍 Debug Info:', {
      tier,
      billingInterval,
      tierConfig: tierConfig ? 'exists' : 'missing',
      billingConfig: billingConfig ? 'exists' : 'missing',
      priceId: priceId || 'missing',
      stripeKey: process.env.STRIPE_SECRET_KEY ? 'exists' : 'missing',
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'exists' : 'missing'
    });

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not found for the selected tier and billing interval' },
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/subscribe?canceled=true`,
      metadata: {
        userId,
        tier,
        billingInterval,
      },
      customer_email: userEmail,
    });

    return NextResponse.json({ sessionId: session.id }, { 
      headers: {
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return ErrorHandler.handleAPIError(error, 'create-checkout-session');
  }
}); 