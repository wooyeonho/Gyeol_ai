'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const next = locale === 'ko' ? 'en' : 'ko';
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    router.refresh();
  }

  return (
    <button
      onClick={switchLocale}
      className="text-sm text-white/60 hover:text-white px-2 py-1 rounded"
      title={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
    >
      {locale === 'ko' ? 'EN' : 'KO'}
    </button>
  );
}
