"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CreditCard, Calendar, X } from 'lucide-react';
import { getSubscriptionStatusWithGrace } from '@/lib/subscription-enforcement';

interface SubscriptionNotificationProps {
  onDismiss?: () => void;
}

export function SubscriptionNotification({ onDismiss }: SubscriptionNotificationProps) {
  const { user, subscriptionStatus, userRole } = useAuth();
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    status: string;
    isInGracePeriod: boolean;
    daysRemaining: number;
    isExpired: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user || userRole !== 'owner') {
        setIsLoading(false);
        return;
      }

      try {
        const status = await getSubscriptionStatusWithGrace(user.uid);
        setSubscriptionInfo(status);
        
        // Show dialog for payment issues or canceled subscriptions
        if (status.status === 'past_due' || status.status === 'canceled' || status.isExpired) {
          setShowDialog(true);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [user, userRole]);

  const handleSubscribe = () => {
    router.push('/subscribe');
  };

  const handleManageSubscription = () => {
    router.push('/settings');
  };

  const handleDismiss = () => {
    setShowDialog(false);
    onDismiss?.();
  };

  if (isLoading || !subscriptionInfo || userRole !== 'owner') {
    return null;
  }

  // Don't show anything if subscription is active and not in grace period
  if (subscriptionInfo.status === 'active' && !subscriptionInfo.isInGracePeriod) {
    return null;
  }

  return (
    <>
      {/* Banner notification for grace period */}
      {subscriptionInfo.isInGracePeriod && subscriptionInfo.status === 'past_due' && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Payment Required</AlertTitle>
          <AlertDescription className="text-orange-700">
            Your subscription payment failed. You have {subscriptionInfo.daysRemaining} days remaining to update your payment method before your data is permanently deleted.
            <div className="mt-2 flex gap-2">
              <Button 
                size="sm" 
                onClick={handleManageSubscription}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Update Payment
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleSubscribe}
                className="border-orange-600 text-orange-600 hover:bg-orange-100"
              >
                Renew Subscription
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog for payment issues */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              Subscription Issue
            </DialogTitle>
            <DialogDescription>
              {subscriptionInfo.status === 'past_due' && subscriptionInfo.isInGracePeriod && (
                <>
                  Your subscription payment failed. You have {subscriptionInfo.daysRemaining} days remaining to resolve this issue.
                  <br /><br />
                  After the grace period ends, all your restaurant data will be permanently deleted.
                </>
              )}
              {subscriptionInfo.status === 'canceled' && (
                <>
                  Your subscription has been canceled. You can reactivate it at any time.
                  <br /><br />
                  Your restaurant data will remain accessible until you choose to reactivate or your data is cleaned up.
                </>
              )}
              {subscriptionInfo.isExpired && (
                <>
                  Your subscription grace period has expired. Your restaurant data has been permanently deleted.
                  <br /><br />
                  You can start a new subscription to create new restaurants.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex gap-2">
            {subscriptionInfo.status === 'past_due' && subscriptionInfo.isInGracePeriod && (
              <>
                <Button onClick={handleManageSubscription} className="flex-1">
                  Update Payment Method
                </Button>
                <Button onClick={handleSubscribe} variant="outline" className="flex-1">
                  Renew Subscription
                </Button>
              </>
            )}
            {subscriptionInfo.status === 'canceled' && (
              <>
                <Button onClick={handleSubscribe} className="flex-1">
                  Reactivate Subscription
                </Button>
                <Button onClick={handleManageSubscription} variant="outline" className="flex-1">
                  Manage Account
                </Button>
              </>
            )}
            {subscriptionInfo.isExpired && (
              <>
                <Button onClick={handleSubscribe} className="flex-1">
                  Start New Subscription
                </Button>
                <Button onClick={handleDismiss} variant="outline">
                  Dismiss
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 