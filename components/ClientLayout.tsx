'use client';

import { Navigation } from '@/components/Navigation';
import { GuestBanner } from '@/components/GuestBanner';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuestBanner />
      <div className="pb-20 min-h-screen md:pb-20">
        {children}
      </div>
      <Navigation />
    </>
  );
}
