'use client';

import { Navigation } from '@/components/Navigation';
import { GuestBanner } from '@/components/GuestBanner';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuestBanner />
      {children}
      <Navigation />
    </>
  );
}
