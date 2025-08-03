"use client";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ForgotPasswordPage() {
  const { user, loading, isEmailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Set document title for client components
    document.title = "Forgot Password | MenuLink";
    if (!loading && user && isEmailVerified) {
      router.replace("/"); // Redirect if already logged in and verified
    }
  }, [user, loading, isEmailVerified, router]);

  if (loading) {
    // Show a loading state while checking auth
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
        <p>Loading...</p> 
      </div>
    );
  }

  // If user is logged in and verified, show loading while redirecting
  if (user && isEmailVerified) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
        <p>Redirecting...</p> 
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
      <div className="w-full max-w-md">
        <Card className="shadow-xl rounded-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-primary">
              Reset Password
            </CardTitle>
            <CardDescription>
              Enter your email to receive a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ForgotPasswordForm onBackToSignIn={() => router.push("/auth/login")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 