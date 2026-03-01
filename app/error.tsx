'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  async function handleReset() {
    // 세션 복구 시도
    const supabase = createClient();
    await supabase?.auth.getSession();
    reset();
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-red-500 mb-4">문제가 발생했어요</h2>
        <p className="text-gray-400 mb-6">
          예상치 못한 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
