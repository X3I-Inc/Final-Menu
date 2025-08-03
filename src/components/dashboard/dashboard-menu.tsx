"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, ChefHat, Settings, Plus, Menu } from 'lucide-react';
import Link from 'next/link';

interface DashboardMenuProps {
  userRole: string;
  canAddMoreRestaurants: boolean;
  hasRestaurants: boolean;
}

export function DashboardMenu({ userRole, canAddMoreRestaurants, hasRestaurants }: DashboardMenuProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Add Restaurant Section */}
      {(userRole === 'superowner' || (userRole === 'owner' && canAddMoreRestaurants)) && (
        <Card className="shadow-lg rounded-xl hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-6 w-6 text-primary" />
              Add Restaurant
            </CardTitle>
            <CardDescription>
              Create a new restaurant and start managing its menu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/add-restaurant">
                <Building className="mr-2 h-4 w-4" />
                Add New Restaurant
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manage Menu Section */}
      {hasRestaurants && (
        <Card className="shadow-lg rounded-xl hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Menu className="h-6 w-6 text-primary" />
              Manage Menu
            </CardTitle>
            <CardDescription>
              Edit restaurant details, categories, and menu items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/manage-menu">
                <ChefHat className="mr-2 h-4 w-4" />
                Manage Menu
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settings Section */}
      <Card className="shadow-lg rounded-xl hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </CardTitle>
          <CardDescription>
            Manage your account settings and subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Go to Settings
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 