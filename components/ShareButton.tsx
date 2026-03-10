'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { shareContent } from '@/lib/share';

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ShareButton({ url, title, text, className = '', children }: ShareButtonProps) {
  const t = useTranslations('errors');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleShare() {
    const result = await shareContent({ url, title, text });
    if (result.success) {
      setStatus('success');
      if (result.method === 'clipboard') {
        alert(t('shareCopied'));
      }
      setTimeout(() => setStatus('idle'), 2000);
    } else if (result.error !== 'cancelled') {
      setStatus('error');
      alert(t('shareFailed'));
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className={className}
      title="공유하기"
      aria-label="공유하기"
    >
      {children ?? (status === 'success' ? '✓' : '↗')}
    </button>
  );
}
