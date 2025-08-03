"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, CreditCard } from 'lucide-react';
import { subscriptionTiers } from '@/lib/subscription-config';
import { getAllRestaurants, deleteRestaurant } from '@/lib/data';
import type { Restaurant } from '@/lib/data';

interface RestaurantLimitEnforcerProps {
  onRestaurantsUpdated?: () => void;
}

export function RestaurantLimitEnforcer({ onRestaurantsUpdated }: RestaurantLimitEnforcerProps) {
  const { userRole, ownedRestaurantIds, subscriptionTier, restaurantLimit } = useAuth();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Only show for owners with active subscriptions
  if (userRole !== 'owner' || !subscriptionTier || !restaurantLimit) {
    return null;
  }

  const currentTierConfig = subscriptionTiers[subscriptionTier as keyof typeof subscriptionTiers];
  const allowedLimit = currentTierConfig?.restaurantLimit || 1;
  const currentCount = ownedRestaurantIds.length;
  const isOverLimit = currentCount > allowedLimit;

  // Load restaurants if we're over the limit
  React.useEffect(() => {
    if (isOverLimit) {
      loadRestaurants();
    }
  }, [isOverLimit, loadRestaurants]);

  const loadRestaurants = async () => {
    setIsLoading(true);
    try {
      const allRestaurants = await getAllRestaurants();
      // Filter to only show restaurants owned by this user
      const userRestaurants = allRestaurants.filter(restaurant => 
        ownedRestaurantIds.includes(restaurant.id)
      );
      setRestaurants(userRestaurants);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load restaurants. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string, restaurantName: string) => {
    setIsDeleting(restaurantId);
    try {
      const success = await deleteRestaurant(restaurantId);
      if (success) {
        toast({
          title: "Restaurant Deleted",
          description: `${restaurantName} has been deleted successfully.`,
        });
        
        // Refresh the restaurants list
        await loadRestaurants();
        
        // Notify parent component
        if (onRestaurantsUpdated) {
          onRestaurantsUpdated();
        }
      } else {
        throw new Error('Failed to delete restaurant');
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "There was an issue deleting the restaurant. Please try again.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  if (!isOverLimit) {
    return null;
  }

  const excessCount = currentCount - allowedLimit;

  return (
    <Card className="border-destructive shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          Restaurant Limit Exceeded
        </CardTitle>
        <CardDescription>
          Your current plan allows {allowedLimit} restaurant{allowedLimit !== 1 ? 's' : ''}, but you own {currentCount}. 
          You need to delete {excessCount} restaurant{excessCount !== 1 ? 's' : ''} to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            You must delete {excessCount} restaurant{excessCount !== 1 ? 's' : ''} to comply with your {subscriptionTier} plan limits. 
            You can upgrade your plan or delete restaurants below.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Your Restaurants</h3>
            <Badge variant="destructive">
              {currentCount} / {allowedLimit}
            </Badge>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Loading restaurants...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{restaurant.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {restaurant.menuCategories.length} categories, {restaurant.menuCategories.reduce((acc, cat) => acc + cat.items.length, 0)} items
                    </p>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting === restaurant.id}
                      >
                        {isDeleting === restaurant.id ? (
                          "Deleting..."
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{restaurant.name}&quot;? This action cannot be undone and will permanently remove all menu items and data associated with this restaurant.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteRestaurant(restaurant.id, restaurant.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Restaurant
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>
              Need more restaurants? Consider upgrading to a higher tier plan.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 