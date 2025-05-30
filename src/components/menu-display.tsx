"use client";

import type { Restaurant } from '@/lib/data';
import RestaurantProfile from '@/components/restaurant-profile';
import MenuItemCard from '@/components/menu-item-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PackageOpen, Edit3 } from 'lucide-react'; 
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

interface MenuDisplayProps {
  restaurant: Restaurant | null;
}

export default function MenuDisplay({ restaurant }: MenuDisplayProps) {
  const { user, userRole, loading: authLoading } = useAuth();

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="w-full max-w-md">
          <PackageOpen className="h-5 w-5" />
          <AlertTitle>Restaurant Not Found</AlertTitle>
          <AlertDescription>
            The restaurant you are looking for does not exist or the menu is currently unavailable.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const defaultTab = restaurant.menuCategories.length > 0 ? restaurant.menuCategories[0].id : undefined;

  const canEditMenu = user && (userRole === 'owner' || userRole === 'superowner');

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <RestaurantProfile restaurant={restaurant} />
      </div>

      {canEditMenu && !authLoading && (
        <div className="my-6 flex justify-end">
          <Button variant="outline">
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Menu (Placeholder)
          </Button>
        </div>
      )}

      {restaurant.menuCategories.length > 0 && defaultTab ? (
        <Tabs defaultValue={defaultTab} className="mt-8 md:mt-12">
          <TabsList className="flex flex-wrap h-auto md:h-10 justify-start md:justify-center rounded-lg p-1 bg-secondary mb-6 shadow-sm">
            {restaurant.menuCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md m-1 md:m-0 flex-grow md:flex-grow-0"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {restaurant.menuCategories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
              {category.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg shadow">
                  <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-xl text-muted-foreground">No items in this category yet.</p>
                  <p className="text-sm text-muted-foreground">Check back later or explore other categories!</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
         <div className="mt-8 md:mt-12 text-center py-12 bg-card rounded-lg shadow">
            <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-semibold text-foreground">Menu Coming Soon!</p>
            <p className="text-muted-foreground">This restaurant is preparing their menu. Please check back later.</p>
        </div>
      )}
    </div>
  );
}
