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
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">AI 매칭</h1>
        <p className="text-white/60 text-sm mb-6">다른 GYEOL들과 만나보세요</p>
        
        <div className="space-y-4">
          {matches.map((gyeol) => (
            <div key={gyeol.id} className="p-4 bg-white/5 rounded-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-point to-accent" />
                <div>
                  <h3 className="font-medium">{gyeol.name}</h3>
                  <p className="text-xs text-white/40">Gen {gyeol.gen}</p>
                </div>
              </div>
              <button className="bg-point/20 hover:bg-point/40 text-point px-4 py-2 rounded-lg text-sm">
                대화하기
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
