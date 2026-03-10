/**
 * Skill Market - 스킬 상점
 * GYEOL의 능력 스킬 구매
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

const SKILLS = [
  { id: 'poet', nameKey: 'poet', price: 200, descKey: 'poetDesc' },
  { id: 'musician', nameKey: 'musician', price: 300, descKey: 'musicianDesc' },
  { id: 'storyteller', nameKey: 'storyteller', price: 250, descKey: 'storytellerDesc' },
  { id: 'analyst', nameKey: 'analyst', price: 350, descKey: 'analystDesc' },
  { id: 'companion', nameKey: 'companion', price: 500, descKey: 'companionDesc' },
];

export default function SkillMarketPage() {
  const t = useTranslations('market');
  const tSkills = useTranslations('market.skills');
  const { agent } = useGyeolStore();
  const supabase = createClient();
  const [buying, setBuying] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);
  
  // 프로필에서 코인 조회
  useEffect(() => {
    if (!supabase || !agent) return;
    supabase.from('profiles').select('coins').eq('id', agent.user_id).single()
      .then(({ data }) => { if (data) setCoins(data.coins || 0); });
  }, [supabase, agent]);
  
  async function buySkill(skillId: string) {
    if (!supabase || !agent) return;
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill || skill.price > coins) {
      alert(t('insufficientCoins'));
      return;
    }
    
    setBuying(skillId);
    
    try {
      // 1. 코인 차감
      const { error: coinError } = await supabase.rpc('deduct_coins', { 
        p_user_id: agent.user_id, 
        p_amount: skill.price 
      });
      
      if (coinError) {
        alert(coinError.message || t('buyFailed'));
        setBuying(null);
        return;
      }
      
      // 2. 에이전트 skills 업데이트
      const currentSkills = agent.skills || [];
      await supabase.from('agents').update({
        skills: [...currentSkills, skill.id]
      }).eq('id', agent.id);
      
      // 3. 코인 상태 새로고침
      const { data: profile } = await supabase.from('profiles').select('coins').eq('id', agent.user_id).single();
      if (profile) setCoins(profile.coins);
      
      alert(t('skillAcquired'));
    } catch (err) {
      alert(t('buyError'));
    }
    setBuying(null);
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t('skillsTitle')}</h1>
        <p className="text-white/60 text-sm mb-6">{t('skillsDesc')}</p>
        
        <div className="mb-6 p-3 bg-white/5 rounded-lg flex justify-between items-center">
          <span className="text-white/60">{t('balance')}</span>
          <span className="text-xl font-bold text-point">{coins}</span>
        </div>
        
        <div className="space-y-3">
          {SKILLS.map((skill) => (
            <div key={skill.id} className="p-4 bg-white/5 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-medium">{tSkills(skill.nameKey)}</h3>
                <p className="text-xs text-white/40">{tSkills(skill.descKey)}</p>
              </div>
              <button
                onClick={() => buySkill(skill.id)}
                disabled={buying === skill.id}
                className="bg-point/20 hover:bg-point/40 text-point px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {t('coins', { price: skill.price })}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
