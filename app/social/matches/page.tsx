/**
 * AI Matches - 다른 GYEOL과 매칭
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

interface AIGyeol {
  id: string;
  name: string;
  gen: number;
  personality: { warmth: number; creativity: number };
}

export default function MatchesPage() {
  const t = useTranslations('social');
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
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">{t('loading')}</div>;
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t('matchesTitle')}</h1>
        <p className="text-white/60 text-sm mb-6">{t('matchesDesc')}</p>
        
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-xl font-bold mb-2">{t('comingSoon')}</h2>
          <p className="text-white/60 text-center whitespace-pre-line">
            {t('comingSoonDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
