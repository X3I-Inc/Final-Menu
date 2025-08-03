"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onBackToSignIn?: () => void;
}

export function ForgotPasswordForm({ onBackToSignIn }: ForgotPasswordFormProps) {
  const { sendPasswordResetEmail, error: authError, clearError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    clearError();
    try {
      await sendPasswordResetEmail(values.email);
      setEmailSent(true);
      toast({
        title: "Reset Email Sent",
        description: "Check your email for a password reset link.",
      });
    } catch (e) {
      // Error is handled by the useEffect below
    } finally {
      setIsLoading(false);
    }
  }

  // Display Firebase auth errors from context
  React.useEffect(() => {
    if (authError) {
      toast({
        variant: "destructive",
        title: "Password Reset Failed",
        description: authError.message || "An error occurred. Please try again.",
      });
      clearError();
    }
  }, [authError, toast, clearError]);

  if (emailSent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <h2 className="text-xl font-bold text-primary">Check Your Email</h2>
        <p className="text-center text-muted-foreground">
          We&apos;ve sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
        </p>
        <Button 
          variant="outline" 
          onClick={onBackToSignIn}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-primary">Forgot Password?</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="you@example.com" 
                    {...field} 
                    type="email" 
                    disabled={isLoading} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </Form>
      
      <div className="text-center">
        <Button 
          variant="ghost" 
          onClick={onBackToSignIn}
          className="text-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>
      </div>
    </div>
  );
} 