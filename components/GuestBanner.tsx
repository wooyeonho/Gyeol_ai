/**
 * GuestBanner - 게스트 모드 배너
 */

'use client';

import { useGyeolStore } from '@/store/gyeol-store';
import Link from 'next/link';

export function GuestBanner() {
  const { isGuest } = useGyeolStore();

  if (!isGuest) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-white/10 backdrop-blur-sm border-b border-white/10 z-50">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-white/60">게스트 모드</span>
        <Link href="/login" className="text-xs text-point hover:underline">
          가입하면 데이터가 유지됩니다
        </Link>
      </div>
    </div>
  );
}
