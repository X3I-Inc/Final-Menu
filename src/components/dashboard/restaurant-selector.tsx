
"use client";

import React from 'react';
import type { Restaurant } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface RestaurantSelectorProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string | null;
  onSelectRestaurant: (restaurantId: string) => void;
}

export default function RestaurantSelector({ 
  restaurants, 
  selectedRestaurantId, 
  onSelectRestaurant 
}: RestaurantSelectorProps) {
  if (restaurants.length === 0) {
    // This case should ideally be handled by the parent component (DashboardPage)
    return <p className="text-sm text-muted-foreground">No restaurants available to select.</p>;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="restaurant-select" className="text-sm font-medium">Choose Restaurant to Manage</Label>
      <Select
        value={selectedRestaurantId || undefined} // Ensure Select gets undefined if null for placeholder
        onValueChange={(value) => {
          if (value) { // Ensure a value is selected before calling
            onSelectRestaurant(value);
          }
        }}
      >
        <SelectTrigger id="restaurant-select" className="w-full md:w-[300px] bg-background text-foreground">
          <SelectValue placeholder="Select a restaurant..." />
        </SelectTrigger>
        <SelectContent>
          {restaurants.map((restaurant) => (
            <SelectItem key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

    