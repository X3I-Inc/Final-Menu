"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { User, CreditCard, Settings, Shield, Mail, Calendar, ChevronLeft } from 'lucide-react';
import { SubscriptionManager } from '@/components/dashboard/subscription-manager';
import { ProtectedRoute } from '@/components/auth/protected-route';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, userRole, subscriptionTier, subscriptionStatus } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
  });

  // Check if user needs attention (email not verified or subscription issues)
  const needsAttention = !user?.emailVerified || 
    (userRole === 'owner' && (!subscriptionTier || subscriptionStatus !== 'active'));

  const handleProfileUpdate = async () => {
    try {
      // Here you would typically update the user profile in Firebase
      // For now, we'll just show a success message
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditingProfile(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "There was an issue updating your profile. Please try again.",
      });
    }
  };

  const getSubscriptionStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-8">
      <header>
        <div className="flex items-center gap-4 mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </header>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {needsAttention && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Account Attention Required</AlertTitle>
              <AlertDescription>
                {!user?.emailVerified && "Please verify your email address for account security. "}
                {userRole === 'owner' && (!subscriptionTier || subscriptionStatus !== 'active') && 
                  "Your subscription needs attention. Please check the Subscription tab."}
              </AlertDescription>
            </Alert>
          )}
          
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Display Name</Label>
                      <p className="text-sm mt-1">{user?.displayName || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm mt-1">{user?.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                      <p className="text-sm mt-1 font-mono text-xs">{user?.uid}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <p className="text-sm mt-1 capitalize">{userRole}</p>
                    </div>
                  </div>
                  <Button onClick={() => setIsEditingProfile(true)}>
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        placeholder="Enter your display name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profileData.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleProfileUpdate}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Account Security
              </CardTitle>
              <CardDescription>
                Manage your account security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    Ensure your email is verified for account security
                  </p>
                </div>
                <Badge variant={user?.emailVerified ? "default" : "secondary"}>
                  {user?.emailVerified ? "Verified" : "Not Verified"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Change your account password
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          {userRole === 'owner' ? (
            <>
              <Card className="shadow-lg rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-6 w-6 text-primary" />
                    Current Subscription
                  </CardTitle>
                  <CardDescription>
                    View your current subscription details and status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Plan</Label>
                      <p className="text-sm mt-1 capitalize">{subscriptionTier || 'No active plan'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge className={getSubscriptionStatusColor(subscriptionStatus)}>
                          {subscriptionStatus || 'No subscription'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {subscriptionTier && (
                <SubscriptionManager onSubscriptionUpdated={() => window.location.reload()} />
              )}

              {!subscriptionTier && (
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertTitle>No Active Subscription</AlertTitle>
                  <AlertDescription>
                    You don&apos;t have an active subscription. Subscribe to a plan to access premium features.
                  </AlertDescription>
                </Alert>
              )}

              {subscriptionTier && subscriptionStatus === 'canceled' && (
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertTitle>Subscription Canceled</AlertTitle>
                  <AlertDescription>
                    Your subscription has been canceled. You can reactivate it or create a new subscription using the subscription manager above.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Card className="shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  Super Owner Account
                </CardTitle>
                <CardDescription>
                  You have unlimited access as a super owner.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Unlimited Restaurants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="font-medium">All Features Enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Priority Support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 