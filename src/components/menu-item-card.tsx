import type { MenuItem } from '@/lib/data';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl group rounded-lg",
      !item.isAvailable && "opacity-60"
    )}>
      <div className="relative w-full h-48 sm:h-56">
        <Image 
          src={item.imageUrl} 
          alt={item.name} 
          layout="fill" 
          objectFit="cover" 
          className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
          data-ai-hint={item.dataAiHint || "food item"}
        />
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-sm px-3 py-1">Out of Stock</Badge>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-200">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <CardDescription className="text-sm text-muted-foreground h-12 overflow-hidden line-clamp-2">{item.description}</CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-0 pb-4">
        <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
        {item.isAvailable && <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">Available</Badge>}
      </CardFooter>
    </Card>
  );
}
