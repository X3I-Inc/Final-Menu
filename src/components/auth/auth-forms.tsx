
"use client";

import * as React from "react"; // Added this line
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
import { useRouter } from "next/navigation";
import type { AuthError } from "firebase/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

// Base schema for sign in
const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

// Extended schema for sign up
const signUpSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  dateOfBirth: z.string().refine((date) => {
    const today = new Date();
    const birthDate = new Date(date);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 13;
    }
    return age >= 13;
  }, { message: "You must be at least 13 years old to register." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number." 
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

interface AuthFormProps {
  isSignUp?: boolean;
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

export function AuthForm({ isSignUp = false, onSuccess, onForgotPassword }: AuthFormProps) {
  const { signUpWithEmail, signInWithEmail, error: authError, clearError, user, isEmailVerified } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // Use different schemas based on whether it's sign up or sign in
  const schema = isSignUp ? signUpSchema : signInSchema;

  const form = useForm<SignInFormValues | SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues: isSignUp ? {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      email: "",
      password: "",
      confirmPassword: "",
    } : {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInFormValues | SignUpFormValues) {
    setIsLoading(true);
    clearError(); // Clear previous errors
    try {
      let user;
      if (isSignUp) {
        const signUpValues = values as SignUpFormValues;
        user = await signUpWithEmail(
          signUpValues.email, 
          signUpValues.password,
          {
            firstName: signUpValues.firstName,
            lastName: signUpValues.lastName,
            dateOfBirth: signUpValues.dateOfBirth,
          }
        );
        if (user) {
          setEmailVerificationSent(true);
        }
      } else {
        const signInValues = values as SignInFormValues;
        user = await signInWithEmail(signInValues.email, signInValues.password);
        // Check if user is logged in but email is not verified
        if (user && !user.emailVerified) {
          toast({
            variant: "destructive",
            title: "Email Not Verified",
            description: "Please check your email and click the verification link before signing in.",
          });
          return;
        }
      }

      if (user) {
        toast({
          title: isSignUp ? "Account Created" : "Signed In",
          description: isSignUp ? "Welcome! Your account has been successfully created." : "Welcome back!",
        });
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/"); // Default redirect to homepage
          router.refresh(); // To ensure header updates
        }
      } else if (authError) {
         // This case is now handled by the useEffect for authError
      }
    } catch (e) { // Catch any unexpected errors from the auth functions themselves
      const err = e as AuthError;
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Display Firebase auth errors from context
  React.useEffect(() => {
    if (authError) {
      toast({
        variant: "destructive",
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
        description: authError.message || "An error occurred. Please try again.",
      });
      clearError(); // Clear the error after displaying it
    }
  }, [authError, toast, isSignUp, clearError]);

  if (emailVerificationSent && isSignUp) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <h2 className="text-xl font-bold text-primary">Verify Your Email</h2>
        <p className="text-center text-muted-foreground">A verification link has been sent to your email address. Please check your inbox and verify your email before logging in.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isSignUp && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      disabled={isLoading}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} type="email" disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    placeholder="••••••••" 
                    {...field} 
                    type={showPassword ? "text" : "password"} 
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isSignUp && (
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      placeholder="••••••••" 
                      {...field} 
                      type={showConfirmPassword ? "text" : "password"} 
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            isSignUp ? "Create Account" : "Sign In"
          )}
        </Button>
        
        {!isSignUp && onForgotPassword && (
          <div className="text-center">
            <Button 
              type="button"
              variant="ghost" 
              onClick={onForgotPassword}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot Password?
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
