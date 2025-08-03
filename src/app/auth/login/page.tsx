
"use client";
import { AuthForm } from "@/components/auth/auth-forms";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmailVerification } from "@/components/auth/email-verification";

// Cannot use generateMetadata in a client component.
// export const metadata: Metadata = {
//   title: "Login | MenuLink",
//   description: "Login or create an account to access MenuLink features.",
// };


export default function LoginPage() {
  const { user, loading, isEmailVerified } = useAuth();
  const router = useRouter();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    // Set document title for client components
    document.title = "Login | MenuLink";
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

  // If user is logged in but not verified, show email verification page
  if (user && !isEmailVerified) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
        <EmailVerification />
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
              {showForgotPassword ? "Reset Password" : "Welcome to MenuLink"}
            </CardTitle>
            <CardDescription>
              {showForgotPassword 
                ? "Enter your email to receive a password reset link."
                : "Access your account or create a new one."
              }
            </CardDescription>
            {!showForgotPassword && (
              <div className="text-center mt-4">
                <a 
                  href="/auth/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Forgot your password?
                </a>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {showForgotPassword ? (
              <ForgotPasswordForm onBackToSignIn={() => setShowForgotPassword(false)} />
            ) : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <AuthForm onForgotPassword={() => setShowForgotPassword(true)} />
                </TabsContent>
                <TabsContent value="signup">
                  <AuthForm isSignUp />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
