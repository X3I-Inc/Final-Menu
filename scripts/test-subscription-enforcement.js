#!/usr/bin/env node

/**
 * Test script for subscription enforcement system
 * This script helps test the grace period and cleanup functionality
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// Firebase config (you'll need to add your own config)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Simulate a payment failure for a user
 */
async function simulatePaymentFailure(userId) {
  try {
    console.log(`Simulating payment failure for user: ${userId}`);
    
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error(`User document not found: ${userId}`);
      return;
    }
    
    // Set grace period to 1 day for testing
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 1); // 1 day for testing
    
    await updateDoc(userDocRef, {
      subscriptionStatus: 'past_due',
      paymentFailureDate: new Date().toISOString(),
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Payment failure simulated. Grace period ends: ${gracePeriodEnd.toISOString()}`);
  } catch (error) {
    console.error('Error simulating payment failure:', error);
  }
}

/**
 * Simulate an expired subscription (past grace period)
 */
async function simulateExpiredSubscription(userId) {
  try {
    console.log(`Simulating expired subscription for user: ${userId}`);
    
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error(`User document not found: ${userId}`);
      return;
    }
    
    // Set grace period to yesterday (expired)
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - 1); // Yesterday
    
    await updateDoc(userDocRef, {
      subscriptionStatus: 'past_due',
      paymentFailureDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Expired subscription simulated. Grace period ended: ${gracePeriodEnd.toISOString()}`);
  } catch (error) {
    console.error('Error simulating expired subscription:', error);
  }
}

/**
 * Reset a user's subscription to active
 */
async function resetToActive(userId) {
  try {
    console.log(`Resetting subscription to active for user: ${userId}`);
    
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error(`User document not found: ${userId}`);
      return;
    }
    
    await updateDoc(userDocRef, {
      subscriptionStatus: 'active',
      gracePeriodEnd: null,
      paymentFailureDate: null,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Subscription reset to active for user: ${userId}`);
  } catch (error) {
    console.error('Error resetting subscription:', error);
  }
}

/**
 * Check subscription status for a user
 */
async function checkSubscriptionStatus(userId) {
  try {
    console.log(`Checking subscription status for user: ${userId}`);
    
    const userDocRef = doc(db, 'user_roles', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error(`User document not found: ${userId}`);
      return;
    }
    
    const userData = userDoc.data();
    console.log('Current subscription data:', {
      status: userData.subscriptionStatus,
      tier: userData.subscriptionTier,
      gracePeriodEnd: userData.gracePeriodEnd,
      paymentFailureDate: userData.paymentFailureDate,
      ownedRestaurants: userData.ownedRestaurantIds?.length || 0,
    });
    
    if (userData.gracePeriodEnd) {
      const now = new Date();
      const graceEnd = new Date(userData.gracePeriodEnd);
      const daysRemaining = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Grace period ends: ${userData.gracePeriodEnd}`);
      console.log(`Days remaining: ${daysRemaining}`);
      console.log(`Is expired: ${daysRemaining <= 0}`);
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
  }
}

/**
 * Test the cleanup API endpoint
 */
async function testCleanupAPI() {
  try {
    console.log('Testing cleanup API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/cleanup-expired-subscriptions', {
      method: 'GET',
    });
    
    const result = await response.json();
    console.log('Cleanup API response:', result);
  } catch (error) {
    console.error('Error testing cleanup API:', error);
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  const userId = process.argv[3];
  
  if (!command || !userId) {
    console.log('Usage: node test-subscription-enforcement.js <command> <userId>');
    console.log('');
    console.log('Commands:');
    console.log('  simulate-failure    - Simulate a payment failure (1 day grace period)');
    console.log('  simulate-expired    - Simulate an expired subscription (past grace period)');
    console.log('  reset-active        - Reset subscription to active');
    console.log('  check-status        - Check current subscription status');
    console.log('  test-cleanup        - Test the cleanup API endpoint');
    console.log('');
    console.log('Example:');
    console.log('  node test-subscription-enforcement.js simulate-failure user123');
    return;
  }
  
  switch (command) {
    case 'simulate-failure':
      await simulatePaymentFailure(userId);
      break;
    case 'simulate-expired':
      await simulateExpiredSubscription(userId);
      break;
    case 'reset-active':
      await resetToActive(userId);
      break;
    case 'check-status':
      await checkSubscriptionStatus(userId);
      break;
    case 'test-cleanup':
      await testCleanupAPI();
      break;
    default:
      console.error(`Unknown command: ${command}`);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  simulatePaymentFailure,
  simulateExpiredSubscription,
  resetToActive,
  checkSubscriptionStatus,
  testCleanupAPI,
}; 