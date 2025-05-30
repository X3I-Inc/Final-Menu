import type { Restaurant } from '@/lib/data';
import Image from 'next/image';
import { Phone, MapPin, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface RestaurantProfileProps {
  restaurant: Restaurant;
}

export default function RestaurantProfile({ restaurant }: RestaurantProfileProps) {
  return (
    <Card className="w-full shadow-lg rounded-xl overflow-hidden bg-card">
      <CardHeader className="bg-secondary p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-full overflow-hidden border-4 border-background shadow-md shrink-0">
            <Image 
              src={restaurant.logoUrl} 
              alt={`${restaurant.name} logo`} 
              layout="fill" 
              objectFit="cover"
              data-ai-hint={restaurant.logoAiHint || "restaurant logo"} 
            />
          </div>
          <div>
            <CardTitle className="text-3xl sm:text-4xl font-bold text-primary text-center sm:text-left">{restaurant.name}</CardTitle>
            <CardDescription className="text-foreground mt-1 text-center sm:text-left">{restaurant.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <span>{restaurant.contact.address}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Phone className="h-5 w-5 text-primary shrink-0" />
          <span>{restaurant.contact.phone}</span>
        </div>
        {restaurant.contact.website && (
          <div className="flex items-center gap-3 text-sm">
            <Globe className="h-5 w-5 text-primary shrink-0" />
            <a 
              href={`https://${restaurant.contact.website}`} // Assume https if not specified
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline hover:text-accent transition-colors"
            >
              {restaurant.contact.website}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
