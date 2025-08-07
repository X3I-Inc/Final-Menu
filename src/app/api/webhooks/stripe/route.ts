import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { subscriptionTiers } from '@/lib/subscription-config';
import { trackPaymentFailure, reactivateSubscription } from '@/lib/subscription-enforcement';
import type { Stripe } from 'stripe';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!endpointSecret) {
  console.error('STRIPE_WEBHOOK_SECRET is not configured');
}

// Stripe webhook IPs (for additional validation)
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  '13.235.122.149',
  '18.211.135.69',
  '35.154.171.200',
  '52.15.183.38',
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72',
  '54.241.31.99',
  '54.241.31.102',
  '54.241.34.107',
];

function isValidStripeWebhook(request: NextRequest): boolean {
  const clientIp = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown';
  
  // In production, validate against Stripe's IP range
  if (process.env.NODE_ENV === 'production') {
    return STRIPE_WEBHOOK_IPS.some(ip => clientIp.includes(ip));
  }
  
  // In development, allow all requests
  return true;
}

export async function POST(request: NextRequest) {
  console.log('Webhook received:', request.method, request.url);
  
  // Validate webhook origin - enforce in production
  if (process.env.NODE_ENV === 'production') {
    if (!isValidStripeWebhook(request)) {
      console.error('Invalid webhook origin:', request.headers.get('x-forwarded-for'));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    console.error('Missing Stripe signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    console.log('Webhook signature verified, event type:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle successful subscription purchase
        if (session.mode === 'subscription') {
          const { userId, tier, billingInterval } = session.metadata || {};
          
          if (userId && tier && billingInterval) {
            console.log(`Subscription completed for user ${userId}: ${tier} ${billingInterval}`);
            console.log(`Session ID: ${session.id}, Customer ID: ${session.customer}, Subscription ID: ${session.subscription}`);
            
            // Update user's subscription details in Firestore
            try {
              const userDocRef = doc(db, 'user_roles', userId);
              const tierConfig = subscriptionTiers[tier as keyof typeof subscriptionTiers];
              const restaurantLimit = tierConfig?.restaurantLimit || 1;
              
              await updateDoc(userDocRef, {
                role: 'owner',
                subscriptionTier: tier,
                billingInterval: billingInterval,
                restaurantLimit: restaurantLimit,
                subscriptionStatus: 'active',
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                updatedAt: new Date().toISOString(),
              });
              
              console.log(`User ${userId} subscription updated successfully`);
            } catch (firestoreError) {
              console.error('Error updating user subscription in Firestore:', firestoreError);
              // Don't fail the webhook, but log the error
            }
          }
        }
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription updated: ${subscription.id}, Status: ${subscription.status}`);
        console.log('Subscription metadata:', subscription.metadata);
        console.log('Subscription cancel_at_period_end:', subscription.cancel_at_period_end);
        
        // Find user by subscription ID and update their subscription details
        try {
          // Query to find user with this subscription ID
          const userRolesRef = collection(db, 'user_roles');
          const q = query(userRolesRef, where('stripeSubscriptionId', '==', subscription.id));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            if (userDoc) {
              const userId = userDoc.id;
              
              // Extract tier and billing interval from metadata
              const { tier, billingInterval } = subscription.metadata || {};
              
              // Always update the subscription status
              const updateData: {
                subscriptionStatus: string;
                updatedAt: string;
                subscriptionTier?: string;
                billingInterval?: string;
                restaurantLimit?: number;
              } = {
                subscriptionStatus: subscription.status,
                updatedAt: new Date().toISOString(),
              };
              
              // If we have tier and billing interval metadata, update those too
              if (tier && billingInterval) {
                const tierConfig = subscriptionTiers[tier as keyof typeof subscriptionTiers];
                const restaurantLimit = tierConfig?.restaurantLimit || 1;
                
                updateData.subscriptionTier = tier;
                updateData.billingInterval = billingInterval;
                updateData.restaurantLimit = restaurantLimit;
                
                console.log(`User ${userId} subscription updated: ${tier} ${billingInterval}, limit: ${restaurantLimit}, status: ${subscription.status}`);
              } else {
                console.log(`User ${userId} subscription status updated to: ${subscription.status}`);
              }
              
              await updateDoc(userDoc.ref, updateData);
              
              // Handle payment failures and reactivations
              if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
                console.log(`Payment failure detected for user ${userId}, tracking grace period`);
                await trackPaymentFailure(userId, subscription.id);
              } else if (subscription.status === 'active') {
                // Check if this is a recovery from a failed payment state
                const previousStatus = (event.data as any).previous_attributes?.status;
                if (previousStatus === 'past_due' || previousStatus === 'unpaid') {
                  console.log(`Payment recovered for user ${userId}, reactivating subscription`);
                  await reactivateSubscription(userId, subscription.id);
                }
              }
            }
          } else {
            console.log(`No user found with subscription ID: ${subscription.id}`);
          }
        } catch (firestoreError) {
          console.error('Error updating subscription in Firestore:', firestoreError);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription deleted: ${deletedSubscription.id}`);
        
        // Find user by subscription ID and update their status
        try {
          const userRolesRef = collection(db, 'user_roles');
          const q = query(userRolesRef, where('stripeSubscriptionId', '==', deletedSubscription.id));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            if (userDoc) {
              const userId = userDoc.id;
              
              await updateDoc(userDoc.ref, {
                subscriptionStatus: 'canceled',
                updatedAt: new Date().toISOString(),
              });
              
              console.log(`User ${userId} subscription marked as canceled`);
            }
          } else {
            console.log(`No user found with subscription ID: ${deletedSubscription.id}`);
          }
        } catch (firestoreError) {
          console.error('Error updating subscription deletion in Firestore:', firestoreError);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 