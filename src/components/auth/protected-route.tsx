"use client";

import { useAuth } from "@/hooks/use-auth";
import { EmailVerification } from "./email-verification";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

export function ProtectedRoute({ children, requireEmailVerification = true }: ProtectedRouteProps) {
  const { user, loading, isEmailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Show loading while checking auth status
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return null; // Will redirect to login
  }

  // Show email verification page if email is not verified and verification is required
  if (requireEmailVerification && !isEmailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
        <EmailVerification />
      </div>
    );
  }

  // Show the protected content
  return <>{children}</>;
} 