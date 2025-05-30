
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addMenuCategory, type MenuCategory } from '@/lib/data'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { FolderPlus, Loader2 } from 'lucide-react';

const addCategorySchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }).max(50, {message: "Category name must be 50 characters or less."}),
});

type AddCategoryFormValues = z.infer<typeof addCategorySchema>;

interface AddCategoryFormProps {
  restaurantId: string;
  onCategoryAdded: (newCategory: MenuCategory) => Promise<void>; // Callback to refresh parent state
}

export default function AddCategoryForm({ restaurantId, onCategoryAdded }: AddCategoryFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AddCategoryFormValues>({
    resolver: zodResolver(addCategorySchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: AddCategoryFormValues) => {
    setIsSubmitting(true);
    
    const newCategory = await addMenuCategory(restaurantId, values.name);

    if (newCategory) {
      toast({
        title: "Category Added",
        description: `Category "${newCategory.name}" has been successfully created.`,
        className: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
      });
      form.reset(); 
      await onCategoryAdded(newCategory); // Notify parent to refresh data
    } else {
      toast({
        variant: "destructive",
        title: "Error Adding Category",
        description: "Could not add the new category. Please try again.",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Category Name*</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Sides, Beverages, Specials" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" className="min-w-[150px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Adding...' : 'Add Category'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
