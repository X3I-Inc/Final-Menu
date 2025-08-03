import { getRestaurantById } from '@/lib/data';
import MenuDisplay from '@/components/menu-display';
import type { Metadata } from 'next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PackageOpen } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: { restaurantId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const restaurant = await getRestaurantById(params.restaurantId);
  if (!restaurant) {
    return {
      title: 'Menu Not Found | MenuLink',
      description: 'The requested menu could not be found.',
    };
  }
  return {
    title: `${restaurant.name} Menu | MenuLink`,
    description: `Explore the delicious menu of ${restaurant.name}. ${restaurant.description}`,
  };
}

export default async function RestaurantMenuPage({ params }: Props) {
  const restaurant = await getRestaurantById(params.restaurantId);
  
  if (!restaurant) {
    // This can happen if ID is invalid or restaurant not found in DB
    // MenuDisplay also handles null, but good to catch early
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="w-full max-w-md">
          <PackageOpen className="h-5 w-5" />
          <AlertTitle>Restaurant Not Found</AlertTitle>
          <AlertDescription>
            The menu for restaurant ID &quot;{params.restaurantId}&quot; could not be found. It might be an invalid ID or the restaurant does not exist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return <MenuDisplay restaurant={restaurant} />;
}

// generateStaticParams might be complex if IDs are dynamic integers from Firestore counter
// For now, we'll rely on dynamic rendering.
// export async function generateStaticParams() {
//   // const restaurants = await getAllRestaurants();
//   // return restaurants.map((restaurant) => ({
//   //   restaurantId: restaurant.id,
//   // }))
//   return []; 
// }
