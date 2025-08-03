// src/app/subscribe/page.tsx

"use client";
import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useCSRF } from "@/components/csrf-provider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";

const tiers = [
  {
    name: "Starter",
    id: "starter",
    monthly: 19,
    yearly: 190,
    limit: 1,
    features: ["Basic menu management", "Email support"],
    featured: false,
  },
  {
    name: "Growth",
    id: "growth",
    monthly: 49,
    yearly: 490,
    limit: 5,
    features: ["All Starter features", "Advanced analytics", "Priority support"],
    featured: true, // Highlight this tier
  },
  {
    name: "Pro",
    id: "pro",
    monthly: 99,
    yearly: 990,
    limit: 20,
    features: ["All Growth features", "Custom branding", "API access", "Dedicated support"],
    featured: false,
  },
];

function SubscribeContent() {
  const [billing, setBilling] = useState("monthly");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { getToken } = useCSRF();

  // Redirect if user is already an owner
  React.useEffect(() => {
    if (userRole === 'owner' || userRole === 'superowner') {
      router.push('/dashboard');
    }
  }, [userRole, router]);

  const handleSubscribe = async (tierId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase a subscription.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }

    setIsLoading(tierId);

    try {
      const csrfToken = await getToken();
      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }

      // Get the Firebase Auth ID token for the user
      const idToken = await user.getIdToken();

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${idToken}`, // Add the token here
        },
        body: JSON.stringify({
          tier: tierId,
          billingInterval: billing,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        // Try to parse as JSON, but handle HTML responses gracefully
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          // If it's not JSON (likely HTML error page), show a generic error
          throw new Error(`Server error (${response.status}): ${response.statusText}`);
        }
        
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        throw new Error('Invalid response from server');
      }

      const { sessionId, error } = responseData;

      if (error) {
        throw new Error(error);
      }

      if (!sessionId) {
        throw new Error('No session ID received from server');
      }

      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js');
      const { loadStripe } = stripe;
      const stripeInstance = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      
      if (stripeInstance) {
        const { error: stripeError } = await stripeInstance.redirectToCheckout({
          sessionId,
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }
      } else {
        throw new Error('Failed to load Stripe');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-16 px-4">
      <h1 className="text-4xl font-extrabold mb-4 text-center text-foreground drop-shadow">Choose Your Subscription</h1>
      <div className="flex justify-center items-center mb-10 gap-4">
        <button
          className={`px-4 py-2 rounded-full font-semibold transition border-2 ${
            billing === "monthly" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-transparent text-muted-foreground border-primary hover:bg-primary/10"
          }`}
          onClick={() => setBilling("monthly")}
        >
          Monthly <span className="text-xs text-green-500 ml-1">(1 month free)</span>
        </button>
        <span className="text-muted-foreground font-semibold">or</span>
        <button
          className={`px-4 py-2 rounded-full font-semibold transition border-2 ${
            billing === "yearly" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-transparent text-muted-foreground border-primary hover:bg-primary/10"
          }`}
          onClick={() => setBilling("yearly")}
        >
          Yearly <span className="text-xs text-green-500">(2 months free)</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-w-6xl">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative border rounded-2xl p-8 flex flex-col items-center shadow-lg bg-card transition transform hover:-translate-y-2 hover:shadow-2xl ${
              tier.featured
                ? "border-4 border-primary scale-105 z-10 shadow-primary/30"
                : "border-border"
            }`}
          >
            {tier.featured && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow">Most Popular</span>
            )}
            <h2 className={`text-2xl font-bold mb-2 ${tier.featured ? "text-primary" : "text-foreground"}`}>{tier.name}</h2>
            <div className="text-4xl font-extrabold mb-2 text-foreground">
              ${billing === "monthly" ? tier.monthly : tier.yearly}
              <span className="text-base font-normal text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</span>
            </div>
            <div className="mb-3 text-muted-foreground">Up to {tier.limit} restaurant{tier.limit > 1 ? "s" : ""}</div>
            <ul className="mb-6 text-sm text-muted-foreground list-disc list-inside space-y-1">
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Button
              onClick={() => handleSubscribe(tier.id)}
              disabled={isLoading === tier.id}
              className={`w-full py-2 rounded-lg font-semibold transition text-lg mt-auto shadow-md ${
                tier.featured
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
              }`}
            >
              {isLoading === tier.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Select"
              )}
            </Button>
          </div>
        ))}
        {/* Custom/Enterprise Option */}
        <div className="border-2 border-dashed border-primary rounded-2xl p-8 flex flex-col items-center shadow-lg bg-card transition hover:-translate-y-2 hover:shadow-2xl">
          <h2 className="text-2xl font-bold mb-2 text-primary">Custom</h2>
          <div className="text-3xl font-bold mb-2 text-foreground">Contact Us</div>
          <div className="mb-3 text-muted-foreground">More than 20 restaurants or custom needs?</div>
          <ul className="mb-6 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Personalized quote</li>
            <li>Custom integrations</li>
            <li>Enterprise support</li>
          </ul>
          <Button
            onClick={() => router.push('/request-quote')}
            className="w-full py-2 rounded-lg font-semibold transition text-lg mt-auto shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Request Quote
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <ProtectedRoute>
      <SubscribeContent />
    </ProtectedRoute>
  );
}