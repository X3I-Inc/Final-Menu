// Subscription tier configurations (client-safe)
export const subscriptionTiers = {
  starter: {
    monthly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID!,
      amount: 1900, // $19.00 in cents
    },
    yearly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY_PRICE_ID!,
      amount: 19000, // $190.00 in cents
    },
    restaurantLimit: 1,
  },
  growth: {
    monthly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_MONTHLY_PRICE_ID!,
      amount: 4900, // $49.00 in cents
    },
    yearly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_YEARLY_PRICE_ID!,
      amount: 49000, // $490.00 in cents
    },
    restaurantLimit: 5,
  },
  pro: {
    monthly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!,
      amount: 9900, // $99.00 in cents
    },
    yearly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!,
      amount: 99000, // $990.00 in cents
    },
    restaurantLimit: 20,
  },
};

export type SubscriptionTier = keyof typeof subscriptionTiers; 