import type {Metadata} from 'next';
import { GeistSans } from 'geist/font';
import { GeistMono } from 'geist/font';
import './globals.css';
import AppHeader from '@/components/app-header';
import AppFooter from '@/components/app-footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-provider';
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from '@/components/error-boundary';
import { CSRFProvider } from '@/components/csrf-provider';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'MenuLink | Your Digital Menu Solution',
  description: 'Easily view and share restaurant menus online with MenuLink.',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className={`antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <CSRFProvider>
              <AuthProvider>
                <AppHeader />
                <main className="flex-1 w-full">
                  {children}
                </main>
                <AppFooter />
                <Toaster />
              </AuthProvider>
            </CSRFProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
