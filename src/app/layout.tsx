
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AppHeader from '@/components/app-header';
import AppFooter from '@/components/app-footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MenuLink | Your Digital Menu Solution',
  description: 'Easily view and share restaurant menus online with MenuLink.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className={`antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <AuthProvider>
          <AppHeader />
          <main className="flex-1 w-full">
            {children}
          </main>
          <AppFooter />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
