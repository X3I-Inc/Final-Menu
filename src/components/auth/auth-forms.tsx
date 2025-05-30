
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

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type AuthFormValues = z.infer<typeof formSchema>;

interface AuthFormProps {
  isSignUp?: boolean;
  onSuccess?: () => void;
}

export function AuthForm({ isSignUp = false, onSuccess }: AuthFormProps) {
  const { signUpWithEmail, signInWithEmail, error: authError, clearError } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: AuthFormValues) {
    setIsLoading(true);
    clearError(); // Clear previous errors
    try {
      let user;
      if (isSignUp) {
        user = await signUpWithEmail(values.email, values.password);
      } else {
        user = await signInWithEmail(values.email, values.password);
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


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            isSignUp ? "Create Account" : "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}
