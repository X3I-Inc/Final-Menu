
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  getAllRestaurants,
  getRestaurantById,
  type Restaurant,
  type MenuCategory,
} from '@/lib/data';
import RestaurantSelector from '@/components/dashboard/restaurant-selector';
import MenuItemForm from '@/components/dashboard/menu-item-form';
import AddRestaurantForm from '@/components/dashboard/add-restaurant-form';
import AddCategoryForm from '@/components/dashboard/add-category-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChefHat, Loader2, ShieldAlert, Building, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, userRole, assignedRestaurantId, loading: authLoading } = useAuth();
  const router = useRouter();

  const [restaurantsToManage, setRestaurantsToManage] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const loadPageData = useCallback(async (authUser, authRole, authAssignedId, currentSelectedRestaurantId) => {
    if (!authUser || !authRole) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);

    if (authRole === 'superowner') {
      const allRestaurants = await getAllRestaurants();
      setRestaurantsToManage(allRestaurants);
      if (allRestaurants.length > 0) {
        const selectedStillExists = currentSelectedRestaurantId ? allRestaurants.find(r => r.id === currentSelectedRestaurantId) : null;
        if (selectedStillExists) {
          setSelectedRestaurant(selectedStillExists);
        } else {
          setSelectedRestaurant(allRestaurants[0]); 
        }
      } else {
        setSelectedRestaurant(null); 
      }
    } else if (authRole === 'owner') {
      if (authAssignedId) {
        const ownerRestaurant = await getRestaurantById(authAssignedId);
        if (ownerRestaurant) {
          setRestaurantsToManage([ownerRestaurant]);
          setSelectedRestaurant(ownerRestaurant);
        } else {
          console.error("Owner's assigned restaurant not found:", authAssignedId);
          setRestaurantsToManage([]);
          setSelectedRestaurant(null);
        }
      } else {
        console.warn("Owner user does not have an assignedRestaurantId in auth context.");
        setRestaurantsToManage([]);
        setSelectedRestaurant(null);
      }
    }
    setIsLoadingData(false);
  }, []); 

  useEffect(() => {
    document.title = "Dashboard | MenuLink";

    if (!authLoading && !user) {
      router.replace('/auth/login');
      return; // Exit early if redirecting
    }

    if (!authLoading && user && userRole) {
      loadPageData(user, userRole, assignedRestaurantId, selectedRestaurant?.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, authLoading, assignedRestaurantId, router]); // Removed loadPageData from deps for now to avoid potential loops, will be called explicitly.


  const handleMenuItemAdded = async () => {
    if (selectedRestaurant) {
      setIsLoadingData(true);
      const updatedRestaurant = await getRestaurantById(selectedRestaurant.id);
      setSelectedRestaurant(updatedRestaurant || null);
      // If superowner, refresh the list of all restaurants as one of them changed
      if (userRole === 'superowner') {
        const allRestaurants = await getAllRestaurants();
        setRestaurantsToManage(allRestaurants);
      }
      setIsLoadingData(false);
    }
  };

  const handleRestaurantAdded = async () => {
     if (userRole === 'superowner' && user) {
        await loadPageData(user, userRole, assignedRestaurantId, null); 
    }
  };

  const handleRestaurantSelect = async (restaurantId: string) => {
    if (restaurantId === "") {
        setSelectedRestaurant(null);
        return;
    }
    setIsLoadingData(true);
    const restaurant = await getRestaurantById(restaurantId);
    setSelectedRestaurant(restaurant || null);
    setIsLoadingData(false);
  };

  const handleCategoryAdded = async (newCategory: MenuCategory) => {
    if (selectedRestaurant) {
      setIsLoadingData(true);
      // Re-fetch the specific restaurant to update its categories
      const updatedRestaurant = await getRestaurantById(selectedRestaurant.id);
      setSelectedRestaurant(updatedRestaurant || null);

      // If superowner, also update the list of all restaurants as one has changed
      if (userRole === 'superowner') {
        const allRestaurants = await getAllRestaurants();
        setRestaurantsToManage(allRestaurants);
      }
      setIsLoadingData(false);
    }
  };


  if (authLoading || isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-3/4" />
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-1/4" />
          </CardContent>
        </Card>
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

  const noRestaurantsForSuperOwner = userRole === 'superowner' && restaurantsToManage.length === 0;
  const noAssignedRestaurantForOwner = userRole === 'owner' && !selectedRestaurant && restaurantsToManage.length === 0;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Restaurant Dashboard</h1>
        <p className="text-muted-foreground">Manage your restaurant menus, items, and categories.</p>
      </header>

      {userRole === 'superowner' && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-6 w-6 text-primary" /> Add New Restaurant</CardTitle>
            <CardDescription>Expand your culinary empire by adding a new restaurant.</CardDescription>
          </CardHeader>
          <CardContent>
            <AddRestaurantForm onRestaurantAdded={handleRestaurantAdded} />
          </CardContent>
        </Card>
      )}

      {userRole === 'superowner' && restaurantsToManage.length > 0 && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Select a Restaurant to Manage</CardTitle>
            <CardDescription>Choose which restaurant you want to modify.</CardDescription>
          </CardHeader>
          <CardContent>
            <RestaurantSelector
              restaurants={restaurantsToManage}
              selectedRestaurantId={selectedRestaurant?.id || ""} 
              onSelectRestaurant={handleRestaurantSelect}
            />
          </CardContent>
        </Card>
      )}

      {noRestaurantsForSuperOwner && userRole === 'superowner' && (
         <Alert>
            <ChefHat className="h-4 w-4" />
            <AlertTitle>No Restaurants Available</AlertTitle>
            <AlertDescription>
              There are no restaurants configured yet. Add one above to get started!
            </AlertDescription>
          </Alert>
      )}
      {noAssignedRestaurantForOwner && (
         <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>No Restaurant Assigned</AlertTitle>
            <AlertDescription>
              You do not have a restaurant assigned to manage. Please contact an administrator.
            </AlertDescription>
        </Alert>
      )}

      {selectedRestaurant ? (
        <>
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="h-6 w-6 text-primary" /> Add New Category to: {selectedRestaurant.name}</CardTitle>
              <CardDescription>Create a new section for your menu (e.g., Appetizers, Main Courses, Desserts).</CardDescription>
            </CardHeader>
            <CardContent>
              <AddCategoryForm 
                restaurantId={selectedRestaurant.id} 
                onCategoryAdded={handleCategoryAdded}
              />
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Add New Menu Item to: {selectedRestaurant.name}</CardTitle>
              <CardDescription>Fill in the details for the new menu item.</CardDescription>
            </CardHeader>
            <CardContent>
              <MenuItemForm
                  restaurant={selectedRestaurant}
                  onMenuItemAdd={handleMenuItemAdded}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        userRole === 'superowner' && restaurantsToManage.length > 0 && !isLoadingData && (
          <Alert>
            <ChefHat className="h-4 w-4" />
            <AlertTitle>Select a Restaurant</AlertTitle>
            <AlertDescription>
              Please select a restaurant from the dropdown above to start managing its menu.
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  );
}
