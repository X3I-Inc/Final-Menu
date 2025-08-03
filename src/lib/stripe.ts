import Stripe from 'stripe';

// Initialize Stripe with your secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', // Use the latest API version
});

// Stripe publishable key for client-side
export const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

// Subscription tier configurations
export const subscriptionTiers = {
  starter: {
    monthly: {
      priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
      amount: 1900, // $19.00 in cents
    },
    yearly: {
      priceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
      amount: 19000, // $190.00 in cents
    },
    restaurantLimit: 1,
  },
  growth: {
    monthly: {
      priceId: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID!,
      amount: 4900, // $49.00 in cents
    },
    yearly: {
      priceId: process.env.STRIPE_GROWTH_YEARLY_PRICE_ID!,
      amount: 49000, // $490.00 in cents
    },
    restaurantLimit: 5,
  },
  pro: {
    monthly: {
      priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
      amount: 9900, // $99.00 in cents
    },
    yearly: {
      priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
      amount: 99000, // $990.00 in cents
    },
    restaurantLimit: 20,
  },
};

export type SubscriptionTier = keyof typeof subscriptionTiers;
export type BillingInterval = 'monthly' | 'yearly'; 