"use client";

import React, { useState } from 'react';
import type { Restaurant, MenuItem } from '@/lib/data';
import { deleteMenuItem } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import EditMenuItemForm from './edit-menu-item-form';

interface MenuItemsManagerProps {
  restaurant: Restaurant;
  onMenuItemDeleted?: () => Promise<void>;
  onMenuItemUpdated?: () => Promise<void>;
  categoryId?: string;
}

export default function MenuItemsManager({ 
  restaurant, 
  onMenuItemDeleted,
  onMenuItemUpdated,
  categoryId 
}: MenuItemsManagerProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ categoryId: string; item: MenuItem } | null>(null);

  const handleDeleteItem = async (categoryId: string, item: MenuItem) => {
    setIsDeleting(item.id);
    try {
      const success = await deleteMenuItem(restaurant.id, categoryId, item.id);
      if (success) {
        toast({
          title: "Menu Item Deleted",
          description: `${item.name} has been successfully removed from the menu.`,
          className: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
        });
        if (onMenuItemDeleted) {
          await onMenuItemDeleted();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error Deleting Item",
          description: "Could not delete the menu item. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Item",
        description: error instanceof Error ? error.message : "An unexpected error occurred while deleting the item.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditItem = (categoryId: string, item: MenuItem) => {
    setEditingItem({ categoryId, item });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleItemUpdated = async () => {
    setEditingItem(null);
    if (onMenuItemUpdated) {
      await onMenuItemUpdated();
    }
  };

  const categoriesToShow = categoryId 
    ? restaurant.menuCategories.filter(cat => cat.id === categoryId)
    : restaurant.menuCategories;

  if (editingItem) {
    return (
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Edit Menu Item</CardTitle>
        </CardHeader>
        <CardContent>
          <EditMenuItemForm
            restaurant={restaurant}
            categoryId={editingItem.categoryId}
            item={editingItem.item}
            onMenuItemUpdated={handleItemUpdated}
            onCancel={handleCancelEdit}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {categoriesToShow.map((category) => (
        <div key={category.id}>
          {!categoryId && <h3 className="text-lg font-semibold mb-4">{category.name}</h3>}
          {category.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item) => (
                <div key={item.id} className="relative group border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={item.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(item.name.substring(0,10))}`}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      <p className="text-sm font-medium mt-1">${item.price.toFixed(2)}</p>
                      <p className={`text-xs mt-1 ${item.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {item.isAvailable ? 'Available' : 'Not Available'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditItem(category.id, item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
                          <AlertDialogDescription>
                                                            Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteItem(category.id, item)}
                            disabled={isDeleting === item.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting === item.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              'Delete'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No items in this category yet.</p>
          )}
        </div>
      ))}
    </div>
  );
} 