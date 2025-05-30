
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { 
  type User, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  type AuthError
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface AuthContextType {
  user: User | null;
  userRole: string | null;
  assignedRestaurantId: string | null; // For owners, stores the stringified integer ID
  loading: boolean;
  error: AuthError | null;
  signUpWithEmail: (email: string, password: string) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setError(null); 
      setUserRole(null); 
      setAssignedRestaurantId(null);

      if (currentUser) {
        const userDocRef = doc(db, "user_roles", currentUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const roleData = userDocSnap.data();
            const role = roleData.role || null;
            setUserRole(role);
            if (role === 'owner' && roleData.assignedRestaurantId !== null && roleData.assignedRestaurantId !== undefined) {
              setAssignedRestaurantId(String(roleData.assignedRestaurantId)); // Explicitly convert to string
            }
          } else {
            console.log("User role document not found for UID:", currentUser.uid);
            // If it's a new user just signed up, they might not have a role doc yet.
            // This will be created during the signUpWithEmail flow if they used that.
          }
        } catch (firestoreError) {
          console.error("Error fetching user role:", firestoreError);
        }
      }
      setLoading(false);
    }, (authStateError) => {
      console.error("Auth state error:", authStateError);
      setError(authStateError as AuthError);
      setUserRole(null);
      setAssignedRestaurantId(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => {
    setError(null);
  }

  const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    setUserRole(null); 
    setAssignedRestaurantId(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        // Create a default role document for the new user in Firestore
        const userDocRef = doc(db, "user_roles", userCredential.user.uid);
        try {
          await setDoc(userDocRef, { role: "user", assignedRestaurantId: null }); 
          // The onAuthStateChanged listener will pick up the user and then fetch the role.
          // No need to setUserRole("user") here explicitly as onAuthStateChanged will handle it.
          console.log("Default 'user' role document created in Firestore for new user:", userCredential.user.uid);
        } catch (firestoreSetError) {
          console.error("Error setting default user role in Firestore:", firestoreSetError);
          // Potentially sign out the user or handle this error more gracefully
        }
      }
      // setLoading(false); // onAuthStateChanged will set loading to false
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
      await signOut(auth);
      // User, role, and assignedRestaurantId will be cleared by onAuthStateChanged listener
      // setLoading(false); // onAuthStateChanged will set loading to false
    } catch (e) {
      setError(e as AuthError);
      setLoading(false);
    }
  };
  

  return (
    <AuthContext.Provider value={{ user, userRole, assignedRestaurantId, loading, error, signUpWithEmail, signInWithEmail, signOutUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

