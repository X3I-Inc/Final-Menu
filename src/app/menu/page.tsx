import { getAllRestaurants } from '@/lib/data';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Browse Menus | MenuLink',
  description: 'Browse and explore restaurant menus on MenuLink.',
};

export default async function MenuPage() {
  // Fetch fresh data on every request
  const restaurants = await getAllRestaurants();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Browse Menus</h1>
          <p className="text-xl text-muted-foreground">
            Select a restaurant to view their menu
          </p>
        </div>

        {restaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {restaurants.map((restaurant) => (
              <Link 
                key={restaurant.id} 
                href={`/menu/${restaurant.id}`}
                className="block transition-transform hover:scale-[1.02]"
              >
                <Card className="h-full hover:bg-accent/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-primary" />
                      {restaurant.name}
                    </CardTitle>
                    <CardDescription>
                      {restaurant.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {restaurant.menuCategories.length} menu categories
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">No restaurants available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
} 