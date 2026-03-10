'use client';

import { useState } from 'react';
import { shareContent } from '@/lib/share';

interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ShareButton({ url, title, text, className = '', children }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleShare() {
    const result = await shareContent({ url, title, text });
    if (result.success) {
      setStatus('success');
      if (result.method === 'clipboard') {
        alert('링크가 복사되었습니다');
      }
      setTimeout(() => setStatus('idle'), 2000);
    } else if (result.error !== 'cancelled') {
      setStatus('error');
      alert('공유할 수 없습니다');
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
