import { NextRequest, NextResponse } from 'next/server';
import { stripe, subscriptionTiers } from '@/lib/stripe';
import { z } from 'zod';
import { withCSRFProtection } from '@/lib/csrf';
import { getAuthenticatedUser } from '@/lib/firebase-admin';
import { ErrorHandler } from '@/lib/error-handler';

// Validation schema
const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  newTier: z.enum(['starter', 'growth', 'pro']),
  billingInterval: z.enum(['monthly', 'yearly']),
  userId: z.string().min(1, 'User ID is required'),
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
    const body = await request.json();

    // Validate input
    const validationResult = updateSubscriptionSchema.safeParse(body);
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

    const { subscriptionId, newTier, billingInterval, userId } = validationResult.data;

    // Verify that the userId matches the authenticated user's UID
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    if (authenticatedUser.uid !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User ID mismatch' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // Validate tier and billing interval
    if (!subscriptionTiers[newTier as keyof typeof subscriptionTiers]) {
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

    // Get the new price ID for the selected tier and billing interval
    const tierConfig = subscriptionTiers[newTier as keyof typeof subscriptionTiers];
    const billingConfig = tierConfig[billingInterval as 'monthly' | 'yearly'];
    const newPriceId = billingConfig.priceId;

    if (!newPriceId) {
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

    // Update the subscription with the new price
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations', // This will prorate the difference
      metadata: {
        tier: newTier,
        billingInterval,
        updatedAt: new Date().toISOString(),
      },
    });

    console.log(`Subscription updated: ${subscription.id}, New tier: ${newTier}, Billing: ${billingInterval}`);

    // Also update the user's Firestore document immediately
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const userDocRef = doc(db, 'user_roles', userId);
      
      await updateDoc(userDocRef, {
        subscriptionTier: newTier,
        billingInterval: billingInterval,
        restaurantLimit: tierConfig.restaurantLimit,
        subscriptionStatus: subscription.status,
        updatedAt: new Date().toISOString(),
      });
      
      console.log(`User ${userId} subscription updated in Firestore`);
    } catch (firestoreError) {
      console.error('Error updating user subscription in Firestore:', firestoreError);
    }

    return NextResponse.json({ 
      success: true,
      subscriptionId: subscription.id,
      tier: newTier,
      billingInterval,
      restaurantLimit: tierConfig.restaurantLimit,
      status: subscription.status,
    }, { 
      headers: {
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    return ErrorHandler.handleAPIError(error, 'update-subscription');
  }
}); 