/**
 * Navigation - GYEOL 네비게이션
 * 하단 탭 바
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useGyeolStore } from '@/store/gyeol-store';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '홈', icon: '✨' },
  { href: '/activity', label: '활동', icon: '📊' },
  { href: '/moltbook', label: '피드', icon: '📱' },
  { href: '/market/skins', label: '스킨', icon: '🎨' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export function Navigation() {
  const pathname = usePathname();
  const { agent } = useGyeolStore();
  
  // 로그인/랜딩 페이지에서는 숨기기
  if (pathname === '/login' || pathname === '/landing') {
    return null;
  }
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive
                  ? 'text-point'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
