/**
 * Settings Page - 설정 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { agent } = useGyeolStore();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [tier] = useState('free');
  
  useEffect(() => {
    // Check if agent is loaded
    if (agent) setLoading(false);
  }, [agent]);
  
  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    );
  }
  
  async function saveSettings() {
    if (!agent) return;
    const sb = createClient();
    if (!sb) return;
    
    try {
      await sb
        .from('agents')
        .update({ name: displayName || agent.name })
        .eq('id', agent.id);
      
      alert('설정이 저장되었습니다!');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-8">설정</h1>
        
        {/* 결 정보 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">결 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">이름</label>
              <input
                type="text"
                value={displayName || agent.name}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Gen</label>
              <div className="text-2xl font-bold text-point">Gen {agent.gen}</div>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">대화 수</label>
              <div>{agent.total_conversations}회</div>
            </div>
          </div>
        </section>
        
        {/* 성격 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">성격</h2>
          <div className="space-y-3">
            {Object.entries(agent.personality).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-sm text-white/60">{key}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-point transition-all"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="w-8 text-sm">{value}</span>
              </div>
            ))}
          </div>
        </section>
        
        {/* 티어 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">멤버십</h2>
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{tier === 'free' ? '무료' : tier === 'pro' ? 'Pro' : 'Premium'}</div>
                <div className="text-sm text-white/60">
                  {tier === 'free' ? '하루 20회 대화' : '무제한 대화'}
                </div>
              </div>
              <button 
                className="bg-point px-4 py-2 rounded-lg text-sm"
              >
                업그레이드
              </button>
            </div>
          </div>
        </section>
        
        <button
          onClick={saveSettings}
          className="w-full bg-point py-3 rounded-lg font-medium"
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
