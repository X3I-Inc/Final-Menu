import { subscriptionTiers } from '@/lib/subscription-config';

/**
 * Get restaurant limit based on subscription tier
 */
export function getRestaurantLimit(subscriptionTier: string | null): number {
  if (!subscriptionTier || !subscriptionTiers[subscriptionTier as keyof typeof subscriptionTiers]) {
    return 1; // Default to 1 restaurant for free tier
  }

  const tierConfig = subscriptionTiers[subscriptionTier as keyof typeof subscriptionTiers];
  return tierConfig.restaurantLimit;
}

/**
 * Check if user can add more restaurants
 */
export function canAddRestaurant(
  currentRestaurantCount: number, 
  subscriptionTier: string | null
): boolean {
  const limit = getRestaurantLimit(subscriptionTier);
  return currentRestaurantCount < limit;
}

/**
 * Get remaining restaurant slots
 */
export function getRemainingRestaurantSlots(
  currentRestaurantCount: number, 
  subscriptionTier: string | null
): number {
  const limit = getRestaurantLimit(subscriptionTier);
  return Math.max(0, limit - currentRestaurantCount);
}

/**
 * Get subscription tier display name
 */
export function getSubscriptionTierDisplayName(tier: string): string {
  const tierNames: Record<string, string> = {
    'free': 'Free',
    'starter': 'Starter',
    'growth': 'Growth',
    'pro': 'Pro',
  };
  
  return tierNames[tier] || tier;
}

/**
 * Get subscription status display name
 */
export function getSubscriptionStatusDisplayName(status: string): string {
  const statusNames: Record<string, string> = {
    'active': 'Active',
    'canceled': 'Canceled',
    'past_due': 'Past Due',
    'unpaid': 'Unpaid',
    'incomplete': 'Incomplete',
    'incomplete_expired': 'Incomplete Expired',
    'paused': 'Paused',
  };
  
  return statusNames[status] || status;
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(status: string): boolean {
  return ['active'].includes(status);
}

/**
 * Check if subscription is canceled
 */
export function isSubscriptionCanceled(status: string): boolean {
  return ['canceled', 'incomplete_expired'].includes(status);
}

/**
 * Get price for subscription tier and billing interval
 */
export function getSubscriptionPrice(tier: string, billingInterval: 'monthly' | 'yearly'): number | null {
  if (!subscriptionTiers[tier as keyof typeof subscriptionTiers]) {
    return null;
  }

  const tierConfig = subscriptionTiers[tier as keyof typeof subscriptionTiers];
  const billingConfig = tierConfig[billingInterval];
  
  return billingConfig?.price || null;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price / 100); // Convert from cents to dollars
} 