"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChefHat, ShieldAlert, Building, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/auth/protected-route';
import AddRestaurantForm from '@/components/dashboard/add-restaurant-form';
import Link from 'next/link';

export default function AddRestaurantPage() {
  return (
    <ProtectedRoute>
      <AddRestaurantContent />
    </ProtectedRoute>
  );
}

function AddRestaurantContent() {
  const { user, userRole, subscriptionTier, restaurantLimit, ownedRestaurantIds } = useAuth();
  const router = useRouter();

  // Check if user can add more restaurants based on subscription
  const canAddMoreRestaurants = () => {
    if (userRole === 'superowner') return true;
    if (userRole === 'owner') {
      const limit = getRestaurantLimit(userRole, subscriptionTier || undefined);
      return (ownedRestaurantIds?.length || 0) < limit;
    }
    return false;
  };

  const getRestaurantLimit = (userRole: string, userSubscriptionTier?: string) => {
    switch (userRole) {
      case 'owner':
        if (userSubscriptionTier) {
          switch (userSubscriptionTier) {
            case 'starter':
              return 1;
            case 'growth':
              return 5;
            case 'pro':
              return 20;
            default:
              return 5;
          }
        }
        return 5;
      case 'superowner':
        return 999;
      default:
        return 0;
    }
  };

  const handleRestaurantAdded = async () => {
    // Redirect back to dashboard after adding restaurant
    router.push('/dashboard');
  };

  if (userRole !== 'owner' && userRole !== 'superowner') {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="w-full max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page. Please log in with an authorized account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
      <header>
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Add New Restaurant</h1>
        <p className="text-muted-foreground">Create a new restaurant and start managing its menu.</p>
        {userRole === 'owner' && (
          <p className="text-sm text-muted-foreground mt-2">
            You can manage up to {getRestaurantLimit(userRole, subscriptionTier || undefined)} restaurants. 
            Currently managing {ownedRestaurantIds?.length || 0}.
          </p>
        )}
      </header>

      {canAddMoreRestaurants() ? (
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              Restaurant Information
            </CardTitle>
            <CardDescription>
              Fill in the details for your new restaurant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddRestaurantForm onRestaurantAdded={handleRestaurantAdded} />
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <Building className="h-4 w-4" />
          <AlertTitle>Restaurant Limit Reached</AlertTitle>
          <AlertDescription>
            You have reached your restaurant limit of {getRestaurantLimit(userRole, subscriptionTier || undefined)}. 
            Upgrade your subscription to add more restaurants.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 