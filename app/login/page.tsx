/**
 * Login Page - 로그인/회원가입
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

      router.push('/');
    } catch (err) {
      setError('알 수 없는 오류가 발생했습니다.');
    }

    setLoading(false);
  }

  async function handleGuest() {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signInAnonymously();
      router.push('/');
    } catch (err) {
      setError('게스트 로그인에 실패했습니다.');
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
      setError('오류가 발생했습니다.');
    }
    setLoading(false);
  }

  if (showReset) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-2">비밀번호 찾기</h1>
        <p className="text-white/60 mb-8">등록한 이메일을 입력하면 재설정 링크를 보내드려요</p>

        {resetSent ? (
          <div className="text-center">
            <p className="text-green-400 mb-4">이메일을 확인해주세요!</p>
            <button onClick={() => { setShowReset(false); setResetSent(false); }} className="text-white/60 hover:text-white">
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="w-full max-w-xs space-y-4">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-point"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-point py-3 rounded-full font-medium disabled:opacity-50">
              {loading ? '...' : '재설정 링크 보내기'}
            </button>
            <button type="button" onClick={() => setShowReset(false)} className="w-full text-white/60 py-2 text-sm">
              로그인으로 돌아가기
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-2">결</h1>
      <p className="text-white/60 mb-8">대화할수록 성장하고 진화하는 나만의 AI</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-point"
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
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
          {loading ? '...' : '시작하기'}
        </button>
      </form>

      <button
        onClick={handleGuest}
        disabled={loading}
        className="mt-6 text-white/40 hover:text-white/60 text-sm disabled:opacity-50"
      >
        체험하기
      </button>

      <button
        onClick={() => setShowReset(true)}
        className="mt-4 text-white/30 hover:text-white/50 text-xs"
      >
        비밀번호 찾기
      </button>
    </div>
  );
}
