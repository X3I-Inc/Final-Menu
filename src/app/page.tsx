
import { getDefaultRestaurant } from '@/lib/data';
import MenuDisplay from '@/components/menu-display';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome to MenuLink | View Our Featured Menu',
  description: 'Discover amazing dishes from our featured restaurant on MenuLink.',
};

export default async function HomePage() {
  const restaurant = await getDefaultRestaurant();
  // MenuDisplay will handle the null case if no default restaurant is found
  return <MenuDisplay restaurant={restaurant || null} />;
}
