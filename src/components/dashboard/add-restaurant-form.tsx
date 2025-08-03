
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addRestaurant, type NewRestaurantData } from '@/lib/data'; 
import { uploadImageAndGetURL } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Building, Loader2, Image as ImageIconLucide, Phone, MapPin, Globe } from 'lucide-react';
import Image from 'next/image';

const addRestaurantFormSchema = z.object({
  name: z.string().min(3, { message: "Restaurant name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  contactPhone: z.string().min(7, { message: "Please enter a valid phone number." }),
  contactAddress: z.string().min(5, { message: "Please enter a valid address." }),
  contactWebsite: z.string().url({ message: "Please enter a valid website URL (e.g., https://example.com)." }).optional().or(z.literal('')),
  logoAiHint: z.string().max(30, "AI hint should be short, max 30 chars.").optional(),
});

type AddRestaurantFormValues = z.infer<typeof addRestaurantFormSchema>;

interface AddRestaurantFormProps {
  onRestaurantAdded?: () => Promise<void>;
}

export default function AddRestaurantForm({ onRestaurantAdded }: AddRestaurantFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { user } = useAuth();

  const form = useForm<AddRestaurantFormValues>({
    resolver: zodResolver(addRestaurantFormSchema),
    defaultValues: {
      name: '',
      description: '',
      contactPhone: '',
      contactAddress: '',
      contactWebsite: '',
      logoAiHint: '',
    },
  });

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  const onSubmit = async (values: AddRestaurantFormValues) => {
    setIsSubmitting(true);
    let logoUrlToSave: string | undefined = undefined;
    let finalLogoAiHint = values.logoAiHint;

    try {
      if (logoFile) {
        toast({ title: "Uploading logo...", description: "Please wait.", duration: 10000 }); // Increased duration
        try {
          logoUrlToSave = await uploadImageAndGetURL(logoFile, 'restaurant_logos');
          toast({ title: "Logo Uploaded!", description: "Successfully uploaded restaurant logo.", className: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200" });
        } catch (uploadError) {
          console.error("AddRestaurantForm: Logo upload failed:", uploadError);
          toast({
            variant: "destructive",
            title: "Logo Upload Failed",
            description: uploadError instanceof Error ? uploadError.message : "Could not upload logo. Please try again.",
            duration: 5000,
          });
          setIsSubmitting(false);
          return; 
        }
        finalLogoAiHint = values.logoAiHint || logoFile.name.split('.')[0].substring(0,30); 
      } else if (values.logoAiHint && values.logoAiHint.trim() !== "") {
         finalLogoAiHint = values.logoAiHint.trim().split(' ').slice(0,2).join(' ');
      } else {
        finalLogoAiHint = values.name.toLowerCase().split(' ').slice(0,2).join(' ');
      }
      
      if (!logoUrlToSave && !logoFile) { // Use placeholder only if no file was selected AND no URL was generated
        logoUrlToSave = `https://placehold.co/100x100.png?text=${encodeURIComponent(values.name.substring(0,2))}`;
      }

      const newRestaurantData: NewRestaurantData = {
          name: values.name,
          description: values.description,
          contactPhone: values.contactPhone,
          contactAddress: values.contactAddress,
          contactWebsite: values.contactWebsite || undefined,
          logoUrl: logoUrlToSave, // This will be undefined if no file chosen AND no placeholder logic hit above
          logoAiHint: finalLogoAiHint,
      };

      const newRestaurant = await addRestaurant(newRestaurantData, user?.uid);

      if (newRestaurant) {
        toast({
          title: "Restaurant Added",
          description: `${newRestaurant.name} has been successfully created.`,
          className: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
        });
        form.reset(); 
        setLogoFile(null);
        setLogoPreview(null);
        if (onRestaurantAdded) {
          await onRestaurantAdded();
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error Adding Restaurant",
          description: "Could not add the new restaurant. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error in onSubmit AddRestaurantForm (after logo handling):", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred during submission.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Restaurant Name*</FormLabel>
              <FormControl>
                <Input placeholder="e.g., The Cosmic Cafe" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description*</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the restaurant..." {...field} rows={3} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contact Phone*</FormLabel>
                <FormControl>
                    <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="555-123-4567" {...field} className="pl-8" disabled={isSubmitting} />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="contactAddress"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Contact Address*</FormLabel>
                <FormControl>
                    <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="123 Main St, Anytown" {...field} className="pl-8" disabled={isSubmitting} />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="contactWebsite"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                 <div className="relative">
                  <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="https://www.example.com" {...field} className="pl-8" disabled={isSubmitting} />
                </div>
              </FormControl>
              <FormDescription>Optional. Must be a valid URL if provided.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormItem>
          <FormLabel>Restaurant Logo</FormLabel>
          <FormControl>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoFileChange} 
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              disabled={isSubmitting}
            />
          </FormControl>
          {logoPreview && (
            <div className="mt-2">
              <Image src={logoPreview} alt="Logo preview" width={100} height={100} className="rounded-md border object-cover" />
            </div>
          )}
          <FormDescription>Optional. Upload a logo for the restaurant. Defaults to a placeholder if blank.</FormDescription>
          <FormMessage />
        </FormItem>
        
        <FormField
          control={form.control}
          name="logoAiHint"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Logo AI Hint</FormLabel>
              <FormControl>
                  <Input placeholder="e.g., 'vintage cafe' (max 2 words)" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormDescription>Optional. Up to 2 keywords for placeholder image search or if no logo is uploaded.</FormDescription>
              <FormMessage />
              </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" className="min-w-[180px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Building className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Adding Restaurant...' : 'Add Restaurant'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    