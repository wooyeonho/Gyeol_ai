import './globals.css';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ClientLayout } from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: '결 - GYEOL',
  description: '대화할수록 성장하고 진화하는 나만의 AI',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gyeol.vercel.app'),
  other: {
    'theme-color': '#000000',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black',
  },
  openGraph: {
    title: '결 - GYEOL',
    description: '대화할수록 성장하고 진화하는 나만의 AI',
    url: 'https://gyeol.vercel.app',
    siteName: '결 GYEOL',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '결 - GYEOL',
    description: '대화할수록 성장하고 진화하는 나만의 AI',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientLayout>{children}</ClientLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
