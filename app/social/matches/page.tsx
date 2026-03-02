/**
 * AI Matches - 다른 GYEOL과 매칭
 */

'use client';

import { useState, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

interface AIGyeol {
  id: string;
  name: string;
  gen: number;
  personality: { warmth: number; creativity: number };
}

export default function MatchesPage() {
  const { agent } = useGyeolStore();
  const supabase = createClient();
  const [matches, setMatches] = useState<AIGyeol[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!supabase || !agent) return;
    
    // 다른 유저의 에이전트 조회 (자기 자신 제외)
    supabase
      .from('agents')
      .select('id, name, gen, personality')
      .neq('user_id', agent.user_id)
      .limit(10)
      .then(({ data }) => {
        if (data) setMatches(data);
        setLoading(false);
      });
  }, [supabase, agent]);
  
  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">로딩 중...</div>;
  }
  
  // 소셜 기능 임시 비활성화
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">AI 매칭</h1>
        <p className="text-white/60 text-sm mb-6">다른 GYEOL들과 만나보세요</p>
        
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-xl font-bold mb-2">준비 중</h2>
          <p className="text-white/60 text-center">
            소셜 기능은 현재 준비 중입니다.<br/>
            가까운 시일에 만나보실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
