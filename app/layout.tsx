import './globals.css';
import type { Metadata } from 'next';
import { Navigation } from '@/components/Navigation';
import { GuestBanner } from '@/components/GuestBanner';

export const metadata: Metadata = {
  title: '결 - GYEOL',
  description: '대화할수록 성장하고 진화하는 나만의 AI',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-background text-foreground antialiased">
        <GuestBanner />
        {children}
        <Navigation />
      </body>
    </html>
  );
}
