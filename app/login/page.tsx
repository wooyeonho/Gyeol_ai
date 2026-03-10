/**
 * Login Page - 로그인/회원가입
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

const REF_STORAGE_KEY = 'gyeol_ref_code';

function LoginContent() {
  const t = useTranslations('login');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      sessionStorage.setItem(REF_STORAGE_KEY, ref);
      setRefCode(ref);
    } else {
      setRefCode(sessionStorage.getItem(REF_STORAGE_KEY));
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setLoading(true);

    try {
      // 먼저 로그인 시도
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // 로그인 실패 시 회원가입 시도
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
      }

      const ref = sessionStorage.getItem(REF_STORAGE_KEY);
      if (ref) {
        try {
          const res = await fetch('/api/invite/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: ref }),
          });
          if (res.ok) {
            sessionStorage.removeItem(REF_STORAGE_KEY);
          }
        } catch {
          // 무시
        }
      }

      router.push('/');
    } catch (err) {
      setError(tCommon('error'));
    }

    setLoading(false);
  }

  async function handleGuest() {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signInAnonymously();
      const ref = sessionStorage.getItem(REF_STORAGE_KEY);
      if (ref) {
        try {
          await fetch('/api/invite/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: ref }),
          });
          sessionStorage.removeItem(REF_STORAGE_KEY);
        } catch {
          // 무시
        }
      }
      router.push('/');
    } catch (err) {
      setError(tCommon('error'));
    }
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email) return;
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setResetSent(true);
      }
    } catch {
      setError(tCommon('error'));
    }
    setLoading(false);
  }

  if (showReset) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-2">{t('resetTitle')}</h1>
        <p className="text-white/60 mb-8">{t('resetDesc')}</p>

        {resetSent ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">{t('resetSent')}</p>
            <button onClick={() => { setShowReset(false); setResetSent(false); }} className="text-white/60 hover:text-white">
              {t('backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="w-full max-w-xs space-y-4">
            <input
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-point"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-point py-3 rounded-full font-medium disabled:opacity-50">
              {loading ? '...' : t('sendReset')}
            </button>
            <button type="button" onClick={() => setShowReset(false)} className="w-full text-white/60 py-2 text-sm">
              {t('backToLogin')}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
      <p className="text-white/60 mb-8">{t('tagline')}</p>
      {refCode && (
        <p className="mb-4 text-point/80 text-sm">{t('refApplied')}</p>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="email"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-point"
          required
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-point"
          required
        />
        
        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-point py-3 rounded-full font-medium disabled:opacity-50"
        >
          {loading ? '...' : t('start')}
        </button>
      </form>

      <button
        onClick={handleGuest}
        disabled={loading}
        className="mt-6 text-white/40 hover:text-white/60 text-sm disabled:opacity-50"
      >
        {t('guest')}
      </button>

      <button
        onClick={() => setShowReset(true)}
        className="mt-4 text-white/30 hover:text-white/50 text-xs"
      >
        {t('forgotPassword')}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white/60">Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
