
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Restaurant, MenuItem as MenuItemType } from '@/lib/data';
import { addMenuItem } from '@/lib/data';
import { uploadImageAndGetURL } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { DollarSign, PackagePlus, Image as ImageIconLucide, Loader2 } from 'lucide-react';
import Image from 'next/image';

const menuItemFormSchema = z.object({
  name: z.string().min(3, { message: "Item name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().positive({ message: "Price must be a positive number." }).min(0.01, "Price must be greater than 0."),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  isAvailable: z.boolean().default(true),
  dataAiHint: z.string().max(30, "AI hint should be short, max 30 chars.").optional(),
});

type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormProps {
  restaurant: Restaurant;
  onMenuItemAdd?: () => Promise<void>; 
}

export default function MenuItemForm({ restaurant, onMenuItemAdd }: MenuItemFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '' as unknown as number,
      categoryId: restaurant.menuCategories.length > 0 ? restaurant.menuCategories[0].id : '',
      isAvailable: true,
      dataAiHint: '',
    },
  });
  
  useEffect(() => {
    form.reset({
      name: '',
      description: '',
      price: '' as unknown as number,
      categoryId: restaurant.menuCategories.length > 0 ? restaurant.menuCategories[0].id : '',
      isAvailable: true,
      dataAiHint: '',
    });
    setImageFile(null);
    setImagePreview(null);
  }, [restaurant, form]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const onSubmit = async (values: MenuItemFormValues) => {
    setIsSubmitting(true);
    let imageUrlToSave: string | undefined = undefined;
    let finalDataAiHint = values.dataAiHint;

    try {
      if (imageFile) {
        toast({ title: "Uploading item image...", description: "Please wait.", duration: 10000 }); // Increased duration
        try {
          imageUrlToSave = await uploadImageAndGetURL(imageFile, `menu_item_images/${restaurant.id}`);
          toast({ title: "Image Uploaded!", description: "Successfully uploaded item image.", className: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200" });
        } catch (uploadError) {
          console.error("MenuItemForm: Image upload failed:", uploadError);
          toast({
            variant: "destructive",
            title: "Image Upload Failed",
            description: uploadError instanceof Error ? uploadError.message : "Could not upload image. Please try again.",
            duration: 5000,
          });
          setIsSubmitting(false); // Stop if image upload fails
          return; 
        }
        finalDataAiHint = values.dataAiHint || imageFile.name.split('.')[0].substring(0,30);
      } else if (values.dataAiHint && values.dataAiHint.trim() !== "") {
         finalDataAiHint = values.dataAiHint.trim().split(' ').slice(0,2).join(' ');
      } else {
        finalDataAiHint = values.name.toLowerCase().split(' ').slice(0,2).join(' ');
      }

      if (!imageUrlToSave && !imageFile) { // Use placeholder only if no file selected AND no URL generated
        imageUrlToSave = `https://placehold.co/600x400.png?text=${encodeURIComponent(values.name.substring(0,10))}`;
      }

      const newItemData: Omit<MenuItemType, 'id'> = {
        name: values.name,
        description: values.description,
        price: values.price,
        imageUrl: imageUrlToSave, // This will be undefined if no file chosen AND no placeholder logic hit
        isAvailable: values.isAvailable,
        dataAiHint: finalDataAiHint,
      };

      const success = await addMenuItem(restaurant.id, values.categoryId, newItemData);

      if (success) {
        toast({
          title: "Menu Item Added",
          description: `${values.name} has been successfully added to ${restaurant.name}.`,
          className: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
        });
        form.reset(); 
        setImageFile(null);
        setImagePreview(null);
        if (restaurant.menuCategories.length > 0) {
          form.setValue('categoryId', restaurant.menuCategories[0].id);
        }
        if (onMenuItemAdd) {
          await onMenuItemAdd();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error Adding Item",
          description: "Could not add menu item. The category might be missing or another error occurred.",
        });
      }
    } catch (error) {
       console.error("Error in onSubmit MenuItemForm (after image handling):", error);
      toast({
        variant: "destructive",
        title: "Error Adding Item",
        description: error instanceof Error ? error.message : "An unexpected error occurred while saving the item.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-1">
              <FormLabel>Item Name*</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Quantum Quinoa Bites" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem className="md:col-span-1">
              <FormLabel>Price*</FormLabel>
              <FormControl>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" placeholder="12.50" {...field} step="0.01" className="pl-8" disabled={isSubmitting} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Description*</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the item in detail..." {...field} rows={3} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {restaurant.menuCategories.length > 0 ? (
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
                <FormLabel>Category*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {restaurant.menuCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormItem  className="md:col-span-1">
            <FormLabel>Category*</FormLabel>
            <FormControl>
                <Input value="No categories available" disabled />
            </FormControl>
            <FormDescription className="text-destructive">
                This restaurant has no categories. Add a category first.
            </FormDescription>
          </FormItem>
        )}

        <FormItem className="md:col-span-1">
          <FormLabel>Item Image</FormLabel>
          <FormControl>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={handleImageFileChange} 
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              disabled={isSubmitting}
            />
          </FormControl>
          {imagePreview && (
            <div className="mt-2">
              <Image src={imagePreview} alt="Item image preview" width={100} height={100} className="rounded-md border object-cover aspect-square" />
            </div>
          )}
          <FormDescription>Optional. Upload an image for the menu item.</FormDescription>
        </FormItem>
        
        <FormField
          control={form.control}
          name="dataAiHint"
          render={({ field }) => (
            <FormItem className="md:col-span-1">
              <FormLabel>AI Image Hint</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 'vegan pasta' (max 2 words)" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>Optional. Up to 2 keywords for placeholder image search or if no image is uploaded.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="md:col-span-2 flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-card">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="isAvailable"
                  disabled={isSubmitting}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel htmlFor="isAvailable" className="cursor-pointer">
                  Item is Currently Available
                </FormLabel>
                <FormDescription>
                  Uncheck if the item is out of stock.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="md:col-span-2 flex justify-end">
          <Button 
            type="submit" 
            className="min-w-[150px]" 
            disabled={isSubmitting || restaurant.menuCategories.length === 0}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PackagePlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Adding Item...' : 'Add Menu Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    