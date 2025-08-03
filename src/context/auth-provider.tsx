
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { 
  type User, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  type AuthError,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

interface UserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export interface AuthContextType {
  user: User | null;
  userRole: string | null;
  assignedRestaurantId: string | null; // For owners, stores the stringified integer ID
  ownedRestaurantIds: string[]; // For owners, stores array of restaurant IDs they can manage
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  restaurantLimit: number | null;
  stripeSubscriptionId: string | null;
  loading: boolean;
  error: AuthError | null;
  isEmailVerified: boolean;
  signUpWithEmail: (email: string, password: string, profile?: UserProfile) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedRestaurantId, setAssignedRestaurantId] = useState<string | null>(null);
  const [ownedRestaurantIds, setOwnedRestaurantIds] = useState<string[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [restaurantLimit, setRestaurantLimit] = useState<number | null>(null);
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeFirestore: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up any existing Firestore listener before setting up a new one
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = undefined;
      }

      setUser(currentUser);
      setError(null); 
      setUserRole(null); 
      setAssignedRestaurantId(null);
      setOwnedRestaurantIds([]);
      setSubscriptionTier(null);
      setSubscriptionStatus(null);
      setRestaurantLimit(null);
      setStripeSubscriptionId(null);
      setIsEmailVerified(currentUser?.emailVerified || false);

      if (currentUser) {
        const userDocRef = doc(db, "user_roles", currentUser.uid);
        
        // Set up real-time listener for user role document
        unsubscribeFirestore = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const roleData = userDocSnap.data();
            const role = roleData.role || null;
            setUserRole(role);
            if (role === 'owner') {
              // Handle both old single restaurant assignment and new multiple restaurants
              if (roleData.ownedRestaurantIds && Array.isArray(roleData.ownedRestaurantIds)) {
                setOwnedRestaurantIds(roleData.ownedRestaurantIds);
                // For backward compatibility, set assignedRestaurantId to the first one
                if (roleData.ownedRestaurantIds.length > 0) {
                  setAssignedRestaurantId(String(roleData.ownedRestaurantIds[0]));
                }
              } else if (roleData.assignedRestaurantId !== null && roleData.assignedRestaurantId !== undefined) {
                // Legacy support for single restaurant assignment
                const restaurantId = String(roleData.assignedRestaurantId);
                setAssignedRestaurantId(restaurantId);
                setOwnedRestaurantIds([restaurantId]);
              }
            }
            // Handle subscription data
            setSubscriptionTier(roleData.subscriptionTier || null);
            setSubscriptionStatus(roleData.subscriptionStatus || null);
            setRestaurantLimit(roleData.restaurantLimit || null);
            setStripeSubscriptionId(roleData.stripeSubscriptionId || null);
          } else {
            console.log("User role document not found for UID:", currentUser.uid);
          }
          setLoading(false);
        }, (firestoreError) => {
          // Only log the error if it's not a permissions error during sign out
          if (firestoreError.code !== 'permission-denied' || currentUser) {
            console.error("Error in Firestore listener:", firestoreError);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }, (authStateError) => {
      console.error("Auth state error:", authStateError);
      setError(authStateError as AuthError);
      setUserRole(null);
      setAssignedRestaurantId(null);
      setOwnedRestaurantIds([]);
      setSubscriptionTier(null);
      setSubscriptionStatus(null);
      setRestaurantLimit(null);
      setStripeSubscriptionId(null);
      setIsEmailVerified(false);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const clearError = () => {
    setError(null);
  }

  const signUpWithEmail = async (email: string, password: string, profile?: UserProfile): Promise<User | null> => {
    setLoading(true);
    setError(null);
    setUserRole(null); 
    setAssignedRestaurantId(null);
    setOwnedRestaurantIds([]);
    setSubscriptionTier(null);
    setSubscriptionStatus(null);
    setRestaurantLimit(null);
    setStripeSubscriptionId(null);
    setIsEmailVerified(false);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        // Send email verification
        await sendEmailVerification(userCredential.user);
        
        // Create a default role document for the new user in Firestore
        const userDocRef = doc(db, "user_roles", userCredential.user.uid);
        try {
          await setDoc(userDocRef, { 
            role: "user", 
            assignedRestaurantId: null,
            ownedRestaurantIds: [],
            subscriptionTier: "free",
            subscriptionStatus: "inactive",
            restaurantLimit: 1,
            stripeSubscriptionId: null, // Initialize stripeSubscriptionId
            // Add profile information if provided
            ...(profile && {
              firstName: profile.firstName,
              lastName: profile.lastName,
              dateOfBirth: profile.dateOfBirth,
              createdAt: new Date().toISOString(),
            })
          }); 
          console.log("Default 'user' role document created in Firestore for new user:", userCredential.user.uid);
        } catch (firestoreSetError) {
          console.error("Error setting default user role in Firestore:", firestoreSetError);
        }
      }
      return userCredential.user;
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
      return null;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    // Roles and assignedRestaurantId are set by onAuthStateChanged
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // setLoading(false); // onAuthStateChanged will set loading to false
      return userCredential.user;
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
      return null;
    }
  };

  const signOutUser = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Clear user state immediately to prevent Firestore permission errors
      setUser(null);
      setUserRole(null);
      setAssignedRestaurantId(null);
      setOwnedRestaurantIds([]);
      setSubscriptionTier(null);
      setSubscriptionStatus(null);
      setRestaurantLimit(null);
      setStripeSubscriptionId(null);
      setIsEmailVerified(false);
      
      await signOut(auth);
      // Additional cleanup will be handled by onAuthStateChanged listener
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
    }
  };

  const handleSendPasswordResetEmail = async (email: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
      throw e; // Re-throw to allow handling in components
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      assignedRestaurantId, 
      ownedRestaurantIds,
      subscriptionTier,
      subscriptionStatus,
      restaurantLimit,
      stripeSubscriptionId,
      loading, 
      error, 
      isEmailVerified,
      signUpWithEmail, 
      signInWithEmail, 
      sendPasswordResetEmail: handleSendPasswordResetEmail,
      signOutUser, 
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

