import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import Providers from '@/components/providers';
import { SmoothScroll } from '@/components/ui/smooth-scroll';
import { AnimatedBackground } from '@/components/ui/animated-background';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Interview Platform',
  description: 'Enterprise-grade AI-powered voice interview system with automated evaluation',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-[#0a0a0f] text-white overflow-x-hidden`} suppressHydrationWarning>
        <SmoothScroll>
          <AnimatedBackground />
          <Providers>
            <TooltipProvider delayDuration={300}>
              {children}
            </TooltipProvider>
            <Toaster richColors position="top-right" />
          </Providers>
        </SmoothScroll>
      </body>
    </html>
  );
}
