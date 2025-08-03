"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useCSRF } from '@/components/csrf-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard, AlertTriangle, CheckCircle, Calendar, RefreshCw, Plus } from 'lucide-react';
import { subscriptionTiers } from '@/lib/subscription-config';

interface SubscriptionManagerProps {
  onSubscriptionUpdated?: () => void;
}

export function SubscriptionManager({ onSubscriptionUpdated }: SubscriptionManagerProps) {
  const { user, subscriptionTier, subscriptionStatus, userRole, stripeSubscriptionId, ownedRestaurantIds } = useAuth();
  const { toast } = useToast();
  const { token: csrfToken } = useCSRF();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');

  // Show for owners with active or canceled subscriptions
  if (userRole !== 'owner' || !subscriptionTier) {
    return null;
  }

  const currentTierConfig = subscriptionTiers[subscriptionTier as keyof typeof subscriptionTiers];
  const currentPrice = currentTierConfig?.monthly?.amount || 0;
  const currentPriceFormatted = `$${(currentPrice / 100).toFixed(2)}`;

  const isCanceled = subscriptionStatus === 'canceled';

  const handleUpgrade = async () => {
    if (!user || !selectedTier || !stripeSubscriptionId || !csrfToken) return;

    // Check if this is a downgrade and user has too many restaurants
    if (isDowngrade(selectedTier) && !canDowngradeToTier(selectedTier)) {
      toast({
        variant: "destructive",
        title: "Cannot Downgrade",
        description: `You have ${ownedRestaurantIds.length} restaurants but the ${getTierDisplayName(selectedTier)} plan only allows ${getTierLimit(selectedTier)}. Please delete ${ownedRestaurantIds.length - getTierLimit(selectedTier)} restaurant(s) first.`,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          subscriptionId: stripeSubscriptionId,
          newTier: selectedTier,
          billingInterval: selectedBilling,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Subscription Updated",
          description: `Your subscription has been successfully updated to ${selectedTier}.`,
        });
        
        // Refresh the page to update the auth context
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "There was an issue updating your subscription. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !stripeSubscriptionId || !csrfToken) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          subscriptionId: stripeSubscriptionId,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Subscription Canceled",
          description: "Your subscription will be canceled at the end of the current billing period.",
        });
        
        // Refresh the page to update the auth context
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        variant: "destructive",
        title: "Cancel Failed",
        description: "There was an issue canceling your subscription. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!user || !stripeSubscriptionId || !csrfToken) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          subscriptionId: stripeSubscriptionId,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Subscription Reactivated",
          description: "Your subscription has been successfully reactivated.",
        });
        
        // Refresh the page to update the auth context
        window.location.reload();
      } else {
        throw new Error(result.error || 'Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast({
        variant: "destructive",
        title: "Reactivation Failed",
        description: "There was an issue reactivating your subscription. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSubscription = async () => {
    if (!user || !csrfToken) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          tier: selectedTier || 'starter',
          billingInterval: selectedBilling,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const { sessionId, error } = await response.json();

      if (error) {
        throw new Error(error);
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
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTierDisplayName = (tier: string) => {
    const names: Record<string, string> = {
      starter: 'Starter',
      growth: 'Growth',
      pro: 'Pro',
    };
    return names[tier] || tier;
  };

  const getTierPrice = (tier: string, billing: 'monthly' | 'yearly') => {
    const tierConfig = subscriptionTiers[tier as keyof typeof subscriptionTiers];
    if (!tierConfig) return '$0';
    
    const price = billing === 'monthly' ? tierConfig.monthly.amount : tierConfig.yearly.amount;
    return `$${(price / 100).toFixed(2)}/${billing === 'monthly' ? 'month' : 'year'}`;
  };

  const getTierLimit = (tier: string) => {
    const tierConfig = subscriptionTiers[tier as keyof typeof subscriptionTiers];
    return tierConfig?.restaurantLimit || 0;
  };

  // Check if user can downgrade to selected tier
  const canDowngradeToTier = (tier: string) => {
    const newLimit = getTierLimit(tier);
    const currentRestaurantCount = ownedRestaurantIds.length;
    return currentRestaurantCount <= newLimit;
  };

  // Check if selected tier would be a downgrade
  const isDowngrade = (newTier: string) => {
    const currentLimit = getTierLimit(subscriptionTier);
    const newLimit = getTierLimit(newTier);
    return newLimit < currentLimit;
  };

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Subscription Management
        </CardTitle>
        <CardDescription>
          {isCanceled 
            ? "Your subscription has been canceled. You can reactivate it or create a new one."
            : "Manage your current subscription plan and billing."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Subscription Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Current Plan</h3>
              <p className="text-sm text-muted-foreground">
                {getTierDisplayName(subscriptionTier)} Plan
              </p>
            </div>
            <Badge variant={isCanceled ? "destructive" : "secondary"}>
              {getTierPrice(subscriptionTier, 'monthly')}
              {isCanceled && " (Canceled)"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Restaurant Limit:</span>
              <p className="font-medium">{getTierLimit(subscriptionTier)} restaurants</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-medium capitalize">{subscriptionStatus}</p>
            </div>
          </div>

          {isCanceled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Subscription Canceled</AlertTitle>
              <AlertDescription>
                Your subscription has been canceled and will end at the end of the current billing period. 
                You can reactivate it or create a new subscription.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {!isCanceled && (
          <>
            {/* Upgrade/Downgrade Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Change Plan</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">New Plan</label>
                  <Select value={selectedTier} onValueChange={setSelectedTier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(subscriptionTiers).map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          {getTierDisplayName(tier)} - {getTierLimit(tier)} restaurants
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Billing Cycle</label>
                  <Select value={selectedBilling} onValueChange={(value: 'monthly' | 'yearly') => setSelectedBilling(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly (Save 17%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTier && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getTierDisplayName(selectedTier)} Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {getTierLimit(selectedTier)} restaurants • {getTierPrice(selectedTier, selectedBilling)}
                      </p>
                      {isDowngrade(selectedTier) && !canDowngradeToTier(selectedTier) && (
                        <p className="text-sm text-destructive mt-1">
                          ⚠️ You have {ownedRestaurantIds.length} restaurants but this plan only allows {getTierLimit(selectedTier)}. 
                          Delete {ownedRestaurantIds.length - getTierLimit(selectedTier)} restaurant(s) first.
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={handleUpgrade}
                      disabled={
                        isLoading || 
                        selectedTier === subscriptionTier || 
                        (isDowngrade(selectedTier) && !canDowngradeToTier(selectedTier))
                      }
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        selectedTier === subscriptionTier ? 'Current Plan' : 'Update Plan'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel Subscription */}
            <div className="space-y-4">
              <h3 className="font-semibold text-destructive">Cancel Subscription</h3>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Canceling your subscription will remove access to restaurant management features at the end of your current billing period.
                </AlertDescription>
              </Alert>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isLoading}>
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your subscription? You&apos;ll lose access to restaurant management features at the end of your current billing period.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}

        {/* Reactivate or Create New Subscription for Canceled Users */}
        {isCanceled && (
          <div className="space-y-4">
            <h3 className="font-semibold">Reactivate or Create New Subscription</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reactivate Current Subscription */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Reactivate Current Plan</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reactivate your current {getTierDisplayName(subscriptionTier)} plan at the same price.
                  </p>
                  <Button 
                    onClick={handleReactivate}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reactivate
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Create New Subscription */}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Create New Subscription</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose a different plan or billing cycle for a new subscription.
                  </p>
                  
                  <div className="space-y-2">
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(subscriptionTiers).map((tier) => (
                          <SelectItem key={tier} value={tier}>
                            {getTierDisplayName(tier)} - {getTierLimit(tier)} restaurants
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedBilling} onValueChange={(value: 'monthly' | 'yearly') => setSelectedBilling(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly (Save 17%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleCreateNewSubscription}
                    disabled={isLoading || !selectedTier}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 