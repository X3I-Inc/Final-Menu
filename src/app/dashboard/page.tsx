"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  getAllRestaurants,
  getRestaurantById,
  type Restaurant,
} from '@/lib/data';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChefHat, Loader2, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardMenu } from '@/components/dashboard/dashboard-menu';
import { RestaurantLimitEnforcer } from '@/components/dashboard/restaurant-limit-enforcer';
import { SubscriptionNotification } from '@/components/dashboard/subscription-notification';

type UserRole = 'owner' | 'superowner';

function DashboardContent() {
  const { user, userRole, assignedRestaurantId, ownedRestaurantIds, subscriptionTier, restaurantLimit, loading: authLoading } = useAuth();
  const router = useRouter();

  const [restaurantsToManage, setRestaurantsToManage] = useState<Restaurant[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Subscription limits based on tiers
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

  const loadPageData = useCallback(async (
    authUser: unknown,
    authRole: UserRole,
    authAssignedId: string | null,
    authOwnedIds: string[]
  ) => {
    if (!authUser || !authRole) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);

    if (authRole === 'superowner') {
      const allRestaurants = await getAllRestaurants();
      setRestaurantsToManage(allRestaurants);
    } else if (authRole === 'owner') {
      if (authOwnedIds && authOwnedIds.length > 0) {
        const ownerRestaurants = await Promise.all(
          authOwnedIds.map(id => getRestaurantById(id))
        );
        const validRestaurants = ownerRestaurants.filter(r => r !== null) as Restaurant[];
        setRestaurantsToManage(validRestaurants);
      } else {
        console.warn("Owner user does not have any assigned restaurants.");
        setRestaurantsToManage([]);
      }
    }
    setIsLoadingData(false);
  }, []);

  const handleRestaurantsUpdated = useCallback(() => {
    // Reload restaurants when they're updated (e.g., after deletion)
    if (user && userRole) {
      loadPageData(user, userRole as UserRole, assignedRestaurantId, ownedRestaurantIds);
    }
  }, [user, userRole, assignedRestaurantId, ownedRestaurantIds, loadPageData]);

  useEffect(() => {
    document.title = "Dashboard | MenuLink";

    if (!authLoading && !user) {
      router.replace('/auth/login');
      return;
    }

    if (!authLoading && user && userRole) {
      loadPageData(user, userRole as UserRole, assignedRestaurantId, ownedRestaurantIds);
    }
  }, [user, userRole, authLoading, assignedRestaurantId, ownedRestaurantIds, router, loadPageData]);

  // Check if user can add more restaurants based on subscription
  const canAddMoreRestaurants = () => {
    if (userRole === 'superowner') return true;
    if (userRole === 'owner') {
      const limit = getRestaurantLimit(userRole, subscriptionTier || undefined);
      return restaurantsToManage.length < limit;
    }
    return false;
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
        <p>Loading user data or redirecting to login...</p>
      </div>
    );
  }

  if (userRole !== 'owner' && userRole !== 'superowner') {
    console.log('Access denied - User role:', userRole, 'User:', user?.email);
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="w-full max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page. Please log in with an authorized account.
            <br />
            <br />
            Current role: {userRole || 'none'}
            <br />
            User email: {user?.email}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
      {/* Subscription Notification - Shows warnings for payment issues */}
      <SubscriptionNotification />
      
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your restaurant management dashboard.</p>
        {userRole === 'owner' && (
          <p className="text-sm text-muted-foreground mt-2">
            You can manage up to {getRestaurantLimit(userRole, subscriptionTier || undefined)} restaurants. Currently managing {restaurantsToManage.length}.
          </p>
        )}
      </header>

      {/* Restaurant Limit Enforcer - Shows when user exceeds their plan limit */}
      <RestaurantLimitEnforcer onRestaurantsUpdated={handleRestaurantsUpdated} />

      {/* Dashboard Menu */}
      <DashboardMenu 
        userRole={userRole}
        canAddMoreRestaurants={canAddMoreRestaurants()}
        hasRestaurants={restaurantsToManage.length > 0}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              Restaurants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{restaurantsToManage.length}</p>
            <p className="text-sm text-muted-foreground">
              {userRole === 'owner' 
                ? `Limit: ${getRestaurantLimit(userRole, subscriptionTier || undefined)}`
                : 'Unlimited'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {restaurantsToManage.reduce((total, restaurant) => 
                total + restaurant.menuCategories.length, 0
              )}
            </p>
            <p className="text-sm text-muted-foreground">Across all restaurants</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              Total Menu Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {restaurantsToManage.reduce((total, restaurant) => 
                total + restaurant.menuCategories.reduce((catTotal, category) => 
                  catTotal + category.items.length, 0
                ), 0
              )}
            </p>
            <p className="text-sm text-muted-foreground">Across all restaurants</p>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message for New Users */}
      {restaurantsToManage.length === 0 && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              Welcome to MenuLink!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first restaurant and creating your menu.
            </p>
            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                  • Use &quot;Add Restaurant&quot; to create your first restaurant
                </p>
                              <p className="text-sm text-muted-foreground">
                  • Use &quot;Manage Menu&quot; to edit restaurant details and menu items
                </p>
                              <p className="text-sm text-muted-foreground">
                  • Use &quot;Settings&quot; to manage your subscription and account
                </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
