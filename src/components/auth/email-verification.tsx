"use client";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendEmailVerification } from "firebase/auth";
import { useState } from "react";
import { Loader2, Mail, CheckCircle } from "lucide-react";

export function EmailVerification() {
  const { user, isEmailVerified } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    if (!user) return;
    
    setIsResending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send verification email. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isEmailVerified) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-xl">Email Verified!</CardTitle>
          <CardDescription>
            Your email has been successfully verified. You can now access all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            onClick={() => window.location.reload()}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Mail className="h-12 w-12 text-blue-500" />
        </div>
        <CardTitle className="text-xl">Verify Your Email</CardTitle>
        <CardDescription>
          We&apos;ve sent a verification link to <strong>{user?.email}</strong>. 
          Please check your inbox and click the verification link to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground text-center">
          <p>Didn&apos;t receive the email?</p>
          <p>Check your spam folder or click the button below to resend.</p>
        </div>
        <Button 
          className="w-full" 
          onClick={handleResendVerification}
          disabled={isResending}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Resend Verification Email"
          )}
        </Button>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => window.location.reload()}
        >
          I&apos;ve Verified My Email
        </Button>
      </CardContent>
    </Card>
  );
} 