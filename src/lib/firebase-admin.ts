import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { NextRequest } from 'next/server';

// Validate Firebase Admin environment variables
function validateFirebaseAdminConfig() {
  const requiredVars = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Missing Firebase Admin environment variables:', missingVars);
    console.error('Please check your .env.local file and ensure all Firebase Admin variables are set.');
    return false;
  }

  return true;
}

// Initialize Firebase Admin
let firebaseAdminInitialized = false;

if (!getApps().length) {
  if (validateFirebaseAdminConfig()) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
      });
      firebaseAdminInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      firebaseAdminInitialized = false;
    }
  } else {
    console.error('❌ Firebase Admin initialization skipped due to missing environment variables');
    firebaseAdminInitialized = false;
  }
} else {
  firebaseAdminInitialized = true;
}

// Conditional exports - only export if Firebase Admin is properly initialized
export const adminAuth = firebaseAdminInitialized ? getAuth() : null;
export const adminDb = firebaseAdminInitialized ? getFirestore() : null;

// Helper function to verify Firebase ID token
export async function verifyIdToken(idToken: string) {
  if (!firebaseAdminInitialized || !adminAuth) {
    console.error('Firebase Admin not initialized - cannot verify ID token');
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

// Helper function to get user from Authorization header
export async function getAuthenticatedUser(request: Request | NextRequest) {
  if (!firebaseAdminInitialized) {
    console.error('Firebase Admin not initialized - cannot authenticate user');
    return null;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  return await verifyIdToken(idToken);
} 