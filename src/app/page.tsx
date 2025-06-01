import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Utensils, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Welcome to MenuLink | Your Digital Menu Solution',
  description: 'Easily view and share restaurant menus online with MenuLink.',
};

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-24">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to <span className="text-primary">MenuLink</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Your digital menu solution for restaurants. View and share menus online with ease.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/menu">
              <Utensils className="h-5 w-5" />
              View Menus
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
