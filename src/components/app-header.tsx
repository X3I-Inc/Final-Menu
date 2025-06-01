"use client";
import Link from 'next/link';
import { Utensils, LogIn, LogOut, UserCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from './ui/skeleton';

export default function AppHeader() {
  const { user, userRole, loading, signOutUser } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/'); 
    router.refresh(); // To ensure header updates correctly after state change
  };

  const canAccessDashboard = !loading && user && (userRole === 'owner' || userRole === 'superowner');

  return (
    <header className="bg-secondary border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary hover:opacity-90 transition-opacity duration-200">
          <Utensils className="h-7 w-7" />
          <span>MenuLink</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user && <ThemeToggle />}
          {canAccessDashboard && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard" className="flex items-center gap-1 sm:gap-2">
                <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          )}
          {loading ? (
             <div className="flex items-center gap-2">
                {canAccessDashboard && <Skeleton className="h-8 w-24 rounded-md" /> }
                <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  <span className="hidden sm:inline">{user.email || "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                    {userRole && <p className="text-xs leading-none text-muted-foreground">Role: {userRole}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
              <Link href="/auth/login" className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

    