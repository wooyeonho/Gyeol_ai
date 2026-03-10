/**
 * Landing Page - 랜딩 페이지
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const t = useTranslations('landing');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleStart() {
    router.push('/login');
  }

  async function handleGuest() {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signInAnonymously();
      router.push('/');
    } catch (err) {
      console.error('Guest login error:', err);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-bold mb-4">결</h1>
      <p className="text-xl text-white/80 mb-12 text-center">
        {t('taglineLine1')}<br />{t('taglineLine2')}
      </p>

      <button
        onClick={handleStart}
        className="bg-point px-8 py-3 rounded-full font-medium mb-4"
      >
        {t('start')}
      </button>

      <button
        onClick={handleGuest}
        disabled={loading}
        className="text-white/40 hover:text-white/60 text-sm disabled:opacity-50"
      >
        {loading ? '...' : t('try')}
      </button>
    </div>
  );
}
