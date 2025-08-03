"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  getAllRestaurants,
  getRestaurantById,
  deleteRestaurant,
  deleteMenuCategory,
  type Restaurant,
  type MenuCategory,
  type MenuItem,
} from '@/lib/data';
import RestaurantSelector from '@/components/dashboard/restaurant-selector';
import MenuItemForm from '@/components/dashboard/menu-item-form';
import AddCategoryForm from '@/components/dashboard/add-category-form';
import MenuItemsManager from '@/components/dashboard/menu-items-manager';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChefHat, Loader2, ShieldAlert, Building, Layers, Trash2, Pencil, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import EditRestaurantForm from '@/components/dashboard/edit-restaurant-form';
import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

type UserRole = 'owner' | 'superowner';

export default function ManageMenuPage() {
  return (
    <ProtectedRoute>
      <ManageMenuContent />
    </ProtectedRoute>
  );
}

function ManageMenuContent() {
  const { user, userRole, assignedRestaurantId, ownedRestaurantIds, subscriptionTier, restaurantLimit, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurantsToManage, setRestaurantsToManage] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false);

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
    authUser: any,
    authRole: UserRole,
    authAssignedId: string | null,
    authOwnedIds: string[],
    currentSelectedRestaurantId: string | null
  ) => {
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
          setSelectedRestaurant(allRestaurants[0] || null);
        }
      } else {
        setSelectedRestaurant(null);
      }
    } else if (authRole === 'owner') {
      if (authOwnedIds && authOwnedIds.length > 0) {
        const ownerRestaurants = await Promise.all(
          authOwnedIds.map(id => getRestaurantById(id))
        );
        const validRestaurants = ownerRestaurants.filter(r => r !== null) as Restaurant[];
        setRestaurantsToManage(validRestaurants);
        
        if (validRestaurants.length > 0) {
          const selectedStillExists = currentSelectedRestaurantId ? validRestaurants.find(r => r.id === currentSelectedRestaurantId) : null;
          if (selectedStillExists) {
            setSelectedRestaurant(selectedStillExists);
          } else {
            setSelectedRestaurant(validRestaurants[0] || null);
          }
        } else {
          setSelectedRestaurant(null);
        }
      } else {
        console.warn("Owner user does not have any assigned restaurants.");
        setRestaurantsToManage([]);
        setSelectedRestaurant(null);
      }
    }
    setIsLoadingData(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user && userRole) {
      loadPageData(user, userRole as UserRole, assignedRestaurantId, ownedRestaurantIds, selectedRestaurant?.id || null);
    }
  }, [user, userRole, authLoading, assignedRestaurantId, ownedRestaurantIds, loadPageData]);

  // Optimistic update handlers
  const handleMenuItemAddedOptimistic = async (newItem: MenuItem, categoryId: string) => {
    if (!selectedRestaurant) return;

    // Store original state for rollback
    const originalRestaurant = selectedRestaurant;
    const originalRestaurants = restaurantsToManage;

    // Optimistic update: Add the new item to the selected restaurant
    const updatedRestaurant = {
      ...selectedRestaurant,
      menuCategories: selectedRestaurant.menuCategories.map(category =>
        category.id === categoryId
          ? { ...category, items: [...category.items, newItem] }
          : category
      )
    };

    // Update state immediately
    setSelectedRestaurant(updatedRestaurant);
    setRestaurantsToManage(prev => 
      prev.map(restaurant => 
        restaurant.id === selectedRestaurant.id ? updatedRestaurant : restaurant
      )
    );

    try {
      // Verify the update with the server (silent verification)
      const serverRestaurant = await getRestaurantById(selectedRestaurant.id);
      if (serverRestaurant) {
        // Server data is authoritative - update with server data
        setSelectedRestaurant(serverRestaurant);
        setRestaurantsToManage(prev => 
          prev.map(restaurant => 
            restaurant.id === selectedRestaurant.id ? serverRestaurant : restaurant
          )
        );
      }
    } catch (error) {
      console.error("Error verifying menu item addition:", error);
      // Revert to original state on error
      setSelectedRestaurant(originalRestaurant);
      setRestaurantsToManage(originalRestaurants);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add menu item. Please try again.",
      });
    }
  };

  // Keep original function for backward compatibility
  const handleMenuItemAdded = async () => {
    if (selectedRestaurant) {
      console.log("handleMenuItemAdded called for restaurant:", selectedRestaurant.id);
      setIsLoadingData(true);
      
      try {
        const updatedRestaurant = await getRestaurantById(selectedRestaurant.id);
        setSelectedRestaurant(updatedRestaurant || null);
        
        if (userRole === 'superowner') {
          const allRestaurants = await getAllRestaurants();
          setRestaurantsToManage(allRestaurants);
        } else if (userRole === 'owner') {
          const ownerRestaurants = await Promise.all(
            ownedRestaurantIds.map(id => getRestaurantById(id))
          );
          const validRestaurants = ownerRestaurants.filter(r => r !== null) as Restaurant[];
          setRestaurantsToManage(validRestaurants);
        }
      } catch (error) {
        console.error("Error in handleMenuItemAdded:", error);
        toast({
          variant: "destructive",
          title: "Error Refreshing Data",
          description: "Could not refresh restaurant data. Please try again.",
        });
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const handleRestaurantSelect = async (restaurantId: string) => {
    if (restaurantId === "") {
      setSelectedRestaurant(null);
      return;
    }
    
    try {
      const restaurant = await getRestaurantById(restaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load restaurant details. Please try again.",
        });
      }
    } catch (error: unknown) {
      console.error("Error loading restaurant:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load restaurant details. Please try again.",
      });
    }
  };

  const handleCategoryAdded = async (newCategory: MenuCategory) => {
    if (!selectedRestaurant) return;

    // Store original state for rollback
    const originalRestaurant = selectedRestaurant;
    const originalRestaurants = restaurantsToManage;

    // Optimistic update: Add the new category to the selected restaurant
    const updatedRestaurant = {
      ...selectedRestaurant,
      menuCategories: [...selectedRestaurant.menuCategories, newCategory]
    };

    // Update state immediately
    setSelectedRestaurant(updatedRestaurant);
    setRestaurantsToManage(prev => 
      prev.map(restaurant => 
        restaurant.id === selectedRestaurant.id ? updatedRestaurant : restaurant
      )
    );

    try {
      // Verify the update with the server (silent verification)
      const serverRestaurant = await getRestaurantById(selectedRestaurant.id);
      if (serverRestaurant) {
        // Server data is authoritative - update with server data
        setSelectedRestaurant(serverRestaurant);
        setRestaurantsToManage(prev => 
          prev.map(restaurant => 
            restaurant.id === selectedRestaurant.id ? serverRestaurant : restaurant
          )
        );
      }
    } catch (error) {
      console.error("Error verifying category addition:", error);
      // Revert to original state on error
      setSelectedRestaurant(originalRestaurant);
      setRestaurantsToManage(originalRestaurants);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add category. Please try again.",
      });
    }
  };

  const handleRestaurantDeleted = async () => {
    if (userRole === 'superowner' && user) {
      await loadPageData(user, userRole as UserRole, assignedRestaurantId, ownedRestaurantIds, null);
    } else if (userRole === 'owner' && user) {
      await loadPageData(user, userRole as UserRole, assignedRestaurantId, ownedRestaurantIds, null);
    }
  };

  // Optimistic category deletion handler
  const handleCategoryDeletedOptimistic = async (categoryId: string) => {
    if (!selectedRestaurant) return;

    // Store original state for rollback
    const originalRestaurant = selectedRestaurant;
    const originalRestaurants = restaurantsToManage;

    // Optimistic update: Remove the category from the selected restaurant
    const updatedRestaurant = {
      ...selectedRestaurant,
      menuCategories: selectedRestaurant.menuCategories.filter(category => category.id !== categoryId)
    };

    // Update state immediately
    setSelectedRestaurant(updatedRestaurant);
    setRestaurantsToManage(prev => 
      prev.map(restaurant => 
        restaurant.id === selectedRestaurant.id ? updatedRestaurant : restaurant
      )
    );

    try {
      // Verify the update with the server (silent verification)
      const serverRestaurant = await getRestaurantById(selectedRestaurant.id);
      if (serverRestaurant) {
        // Server data is authoritative - update with server data
        setSelectedRestaurant(serverRestaurant);
        setRestaurantsToManage(prev => 
          prev.map(restaurant => 
            restaurant.id === selectedRestaurant.id ? serverRestaurant : restaurant
          )
        );
      }
    } catch (error) {
      console.error("Error verifying category deletion:", error);
      // Revert to original state on error
      setSelectedRestaurant(originalRestaurant);
      setRestaurantsToManage(originalRestaurants);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category. Please try again.",
      });
    }
  };

  // Keep original function for backward compatibility
  const handleCategoryDeleted = async () => {
    if (selectedRestaurant) {
      setIsLoadingData(true);
      const updatedRestaurant = await getRestaurantById(selectedRestaurant.id);
      setSelectedRestaurant(updatedRestaurant || null);

      if (userRole === 'superowner') {
        const allRestaurants = await getAllRestaurants();
        setRestaurantsToManage(allRestaurants);
      } else if (userRole === 'owner') {
        const ownerRestaurants = await Promise.all(
          ownedRestaurantIds.map(id => getRestaurantById(id))
        );
        const validRestaurants = ownerRestaurants.filter(r => r !== null) as Restaurant[];
        setRestaurantsToManage(validRestaurants);
      }
      setIsLoadingData(false);
    }
  };

  const handleRestaurantUpdated = async () => {
    setIsEditingRestaurant(false);
    if (selectedRestaurant) {
      setIsLoadingData(true);
      const updatedRestaurant = await getRestaurantById(selectedRestaurant.id);
      setSelectedRestaurant(updatedRestaurant || null);
      if (userRole === 'superowner') {
        const allRestaurants = await getAllRestaurants();
        setRestaurantsToManage(allRestaurants);
      } else if (userRole === 'owner') {
        const ownerRestaurants = await Promise.all(
          ownedRestaurantIds.map(id => getRestaurantById(id))
        );
        const validRestaurants = ownerRestaurants.filter(r => r !== null) as Restaurant[];
        setRestaurantsToManage(validRestaurants);
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
  const noRestaurantsForOwner = userRole === 'owner' && restaurantsToManage.length === 0;

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
        <h1 className="text-3xl font-bold tracking-tight text-primary">Manage Menu</h1>
        <p className="text-muted-foreground">Edit restaurant details, categories, and menu items.</p>
        {userRole === 'owner' && (
          <p className="text-sm text-muted-foreground mt-2">
            You can manage up to {getRestaurantLimit(userRole, subscriptionTier || undefined)} restaurants. Currently managing {restaurantsToManage.length}.
          </p>
        )}
      </header>

      {/* Restaurant Selector - Show for superowners or owners with multiple restaurants */}
      {((userRole === 'superowner' && restaurantsToManage.length > 0) || 
        (userRole === 'owner' && restaurantsToManage.length > 1)) && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Select a Restaurant to Manage</CardTitle>
            <CardDescription>Choose which restaurant you want to modify.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <RestaurantSelector
                restaurants={restaurantsToManage}
                selectedRestaurantId={selectedRestaurant?.id || ""} 
                onSelectRestaurant={handleRestaurantSelect}
              />
              {selectedRestaurant && userRole === 'superowner' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full md:w-auto">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Restaurant
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &quot;{selectedRestaurant.name}&quot;? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          if (selectedRestaurant) {
                            const success = await deleteRestaurant(selectedRestaurant.id);
                            if (success) {
                              toast({
                                title: "Restaurant Deleted",
                                description: `${selectedRestaurant.name} has been successfully deleted.`,
                              });
                              handleRestaurantDeleted();
                            } else {
                              toast({
                                variant: "destructive",
                                title: "Error Deleting Restaurant",
                                description: "Could not delete the restaurant. Please try again.",
                              });
                            }
                          }
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {noRestaurantsForSuperOwner && userRole === 'superowner' && (
        <Alert>
          <ChefHat className="h-4 w-4" />
          <AlertTitle>No Restaurants Available</AlertTitle>
          <AlertDescription>
            There are no restaurants configured yet. Add one from the dashboard to get started!
          </AlertDescription>
        </Alert>
      )}
      {noRestaurantsForOwner && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>No Restaurants Assigned</AlertTitle>
          <AlertDescription>
            You do not have any restaurants assigned to manage. Please contact an administrator or upgrade your subscription.
          </AlertDescription>
        </Alert>
      )}

      {selectedRestaurant && !isLoadingData && (
        <>
          {isEditingRestaurant ? (
            <Card className="shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle>Edit Restaurant Information</CardTitle>
                <CardDescription>Update the restaurant&apos;s details.</CardDescription>
              </CardHeader>
              <CardContent>
                <EditRestaurantForm
                  restaurant={selectedRestaurant}
                  onRestaurantUpdated={handleRestaurantUpdated}
                  onCancel={() => setIsEditingRestaurant(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-lg rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedRestaurant.name}</CardTitle>
                    <CardDescription>{selectedRestaurant.description}</CardDescription>
                  </div>
                  {(userRole === 'superowner' || (userRole === 'owner' && ownedRestaurantIds.includes(selectedRestaurant.id))) && (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingRestaurant(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Restaurant
                    </Button>
                  )}
                </CardHeader>
              </Card>

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
                  <CardTitle className="flex items-center gap-2"><Layers className="h-6 w-6 text-primary" /> Menu Categories for: {selectedRestaurant.name}</CardTitle>
                  <CardDescription>Manage your menu categories and items.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {selectedRestaurant.menuCategories.map((category) => (
                      <Card key={category.id} className="shadow-lg rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                            <CardTitle>{category.name}</CardTitle>
                            <CardDescription>{category.items.length} items</CardDescription>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{category.name}&quot;? This will also delete all items in this category.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    const success = await deleteMenuCategory(selectedRestaurant.id, category.id);
                                    if (success) {
                                      toast({
                                        title: "Category Deleted",
                                        description: `${category.name} has been successfully deleted.`,
                                      });
                                      handleCategoryDeleted();
                                    } else {
                                      toast({
                                        variant: "destructive",
                                        title: "Error Deleting Category",
                                        description: "Could not delete the category. Please try again.",
                                      });
                                    }
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardHeader>
                        <CardContent>
                          <MenuItemsManager
                            restaurant={selectedRestaurant}
                            onMenuItemDeleted={handleMenuItemAdded}
                            onMenuItemUpdated={handleMenuItemAdded}
                            categoryId={category.id}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
          )}
        </>
      )}

      {!selectedRestaurant && ((userRole === 'superowner' && restaurantsToManage.length > 0) || (userRole === 'owner' && restaurantsToManage.length > 1)) && !isLoadingData && (
        <Alert>
          <ChefHat className="h-4 w-4" />
          <AlertTitle>Select a Restaurant</AlertTitle>
          <AlertDescription>
            Please select a restaurant from the dropdown above to start managing its menu.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 