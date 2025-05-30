
"use client";
import { AuthForm } from "@/components/auth/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Metadata } from "next";

// Cannot use generateMetadata in a client component.
// export const metadata: Metadata = {
//   title: "Login | MenuLink",
//   description: "Login or create an account to access MenuLink features.",
// };


export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Set document title for client components
    document.title = "Login | MenuLink";
    if (!loading && user) {
      router.replace("/"); // Redirect if already logged in
    }
  }, [user, loading, router]);

  if (loading || (!loading && user)) {
    // Show a loading state or null while checking auth/redirecting
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
        <p>Loading...</p> 
      </div>
    );
  }


  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
      <Tabs defaultValue="signin" className="w-full max-w-md">
        <Card className="shadow-xl rounded-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-primary">Welcome to MenuLink</CardTitle>
            <CardDescription>
              {/* This description will be hidden by TabsList for now */}
              Access your account or create a new one.
            </CardDescription>
             <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-2">
            <TabsContent value="signin">
              <AuthForm />
            </TabsContent>
            <TabsContent value="signup">
              <AuthForm isSignUp />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
