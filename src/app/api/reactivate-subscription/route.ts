import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';
import { withCSRFProtection } from '@/lib/csrf';
import { getAuthenticatedUser } from '@/lib/firebase-admin';
import { ErrorHandler } from '@/lib/error-handler';

// Validation schema
const reactivateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
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
    const validationResult = reactivateSubscriptionSchema.safeParse(body);
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

    const { subscriptionId, userId } = validationResult.data;

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

    // Reactivate the subscription by removing the cancel_at_period_end flag
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      metadata: {
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: userId,
      },
    });

    console.log(`Subscription reactivated: ${subscription.id}, Cancel at period end: ${subscription.cancel_at_period_end}`);

    // Also update the user's Firestore document
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const userDocRef = doc(db, 'user_roles', userId);
      
      await updateDoc(userDocRef, {
        subscriptionStatus: 'active',
        updatedAt: new Date().toISOString(),
      });
      
      console.log(`User ${userId} subscription reactivated in Firestore`);
    } catch (firestoreError) {
      console.error('Error updating user subscription in Firestore:', firestoreError);
    }

    return NextResponse.json({ 
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end,
    }, { 
      headers: {
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    return ErrorHandler.handleAPIError(error, 'reactivate-subscription');
  }
}); 