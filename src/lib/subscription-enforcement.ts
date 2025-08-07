import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { stripe } from '@/lib/stripe';

export interface SubscriptionEnforcementConfig {
  gracePeriodDays: number;
  cleanupBatchSize: number;
}

export const DEFAULT_ENFORCEMENT_CONFIG: SubscriptionEnforcementConfig = {
  gracePeriodDays: 30,
  cleanupBatchSize: 50,
};

/**
 * Track payment failure and set grace period
 */
export async function trackPaymentFailure(userId: string, subscriptionId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error(`User document not found for payment failure tracking: ${userId}`);
      return;
    }

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + DEFAULT_ENFORCEMENT_CONFIG.gracePeriodDays);

    await updateDoc(userDocRef, {
      subscriptionStatus: 'past_due',
      paymentFailureDate: new Date().toISOString(),
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`Payment failure tracked for user ${userId}, grace period ends: ${gracePeriodEnd.toISOString()}`);
  } catch (error) {
    console.error('Error tracking payment failure:', error);
    throw error;
  }
}

/**
 * Check if user's subscription is in grace period
 */
export async function isInGracePeriod(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    const gracePeriodEnd = userData.gracePeriodEnd;
    
    if (!gracePeriodEnd) {
      return false;
    }

    const now = new Date();
    const graceEnd = new Date(gracePeriodEnd);
    
    return now < graceEnd;
  } catch (error) {
    console.error('Error checking grace period:', error);
    return false;
  }
}

/**
 * Check if user's subscription has expired (past grace period)
 */
export async function isSubscriptionExpired(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    const gracePeriodEnd = userData.gracePeriodEnd;
    
    if (!gracePeriodEnd) {
      return false;
    }

    const now = new Date();
    const graceEnd = new Date(gracePeriodEnd);
    
    return now >= graceEnd;
  } catch (error) {
    console.error('Error checking subscription expiration:', error);
    return false;
  }
}

/**
 * Get days remaining in grace period
 */
export async function getGracePeriodDaysRemaining(userId: string): Promise<number> {
  try {
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return 0;
    }

    const userData = userDoc.data();
    const gracePeriodEnd = userData.gracePeriodEnd;
    
    if (!gracePeriodEnd) {
      return 0;
    }

    const now = new Date();
    const graceEnd = new Date(gracePeriodEnd);
    const diffTime = graceEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  } catch (error) {
    console.error('Error calculating grace period days remaining:', error);
    return 0;
  }
}

/**
 * Clean up expired subscription data (restaurants, menus, etc.)
 */
export async function cleanupExpiredSubscription(userId: string): Promise<void> {
  try {
    console.log(`Starting cleanup for expired subscription user: ${userId}`);
    
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log(`User document not found for cleanup: ${userId}`);
      return;
    }

    const userData = userDoc.data();
    const ownedRestaurantIds = userData.ownedRestaurantIds || [];

    // Delete all restaurants owned by this user
    const batch = writeBatch(db);
    
    for (const restaurantId of ownedRestaurantIds) {
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      batch.delete(restaurantRef);
      console.log(`Scheduled deletion of restaurant: ${restaurantId}`);
    }

    // Update user document to remove restaurant ownership and reset subscription
    batch.update(userDocRef, {
      ownedRestaurantIds: [],
      assignedRestaurantId: null,
      subscriptionStatus: 'canceled',
      subscriptionTier: 'free',
      restaurantLimit: 1,
      gracePeriodEnd: null,
      paymentFailureDate: null,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
    console.log(`Successfully cleaned up expired subscription for user: ${userId}`);
  } catch (error) {
    console.error('Error cleaning up expired subscription:', error);
    throw error;
  }
}

/**
 * Check and cleanup all expired subscriptions (for scheduled jobs)
 */
export async function cleanupAllExpiredSubscriptions(): Promise<number> {
  try {
    console.log('Starting cleanup of all expired subscriptions...');
    
    const userRolesRef = collection(db, 'user_roles');
    const q = query(
      userRolesRef, 
      where('subscriptionStatus', '==', 'past_due'),
      where('gracePeriodEnd', '<=', new Date().toISOString())
    );
    
    const querySnapshot = await getDocs(q);
    let cleanedCount = 0;
    
    for (const userDoc of querySnapshot.docs) {
      try {
        await cleanupExpiredSubscription(userDoc.id);
        cleanedCount++;
      } catch (error) {
        console.error(`Error cleaning up user ${userDoc.id}:`, error);
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} expired subscriptions`);
    return cleanedCount;
  } catch (error) {
    console.error('Error in bulk cleanup of expired subscriptions:', error);
    throw error;
  }
}

/**
 * Reactivate subscription after successful payment
 */
export async function reactivateSubscription(userId: string, subscriptionId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error(`User document not found for reactivation: ${userId}`);
      return;
    }

    await updateDoc(userDocRef, {
      subscriptionStatus: 'active',
      gracePeriodEnd: null,
      paymentFailureDate: null,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Subscription reactivated for user: ${userId}`);
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * Get subscription status with grace period information
 */
export async function getSubscriptionStatusWithGrace(userId: string): Promise<{
  status: string;
  isInGracePeriod: boolean;
  daysRemaining: number;
  isExpired: boolean;
}> {
  try {
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return {
        status: 'inactive',
        isInGracePeriod: false,
        daysRemaining: 0,
        isExpired: false,
      };
    }

    const userData = userDoc.data();
    const status = userData.subscriptionStatus || 'inactive';
    const isInGracePeriod = await isInGracePeriod(userId);
    const daysRemaining = await getGracePeriodDaysRemaining(userId);
    const isExpired = await isSubscriptionExpired(userId);

    return {
      status,
      isInGracePeriod,
      daysRemaining,
      isExpired,
    };
  } catch (error) {
    console.error('Error getting subscription status with grace:', error);
    return {
      status: 'error',
      isInGracePeriod: false,
      daysRemaining: 0,
      isExpired: false,
    };
  }
} 