import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'never', // URL에 locale 없음, 쿠키로만 전환
  localeDetection: true,
});
