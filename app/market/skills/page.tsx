/**
 * Skill Market - 스킬 상점
 * GYEOL의 능력 스킬 구매
 */

'use client';

import { useState, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

const SKILLS = [
  { id: 'poet', name: '시인', price: 200, desc: '시를 쓸 수 있어요' },
  { id: 'musician', name: '음악가', price: 300, desc: '멋진 음악을 들려줘요' },
  { id: 'storyteller', name: '이야기꾼', price: 250, desc: '흥미로운 이야기를 만들어요' },
  { id: 'analyst', name: '분석가', price: 350, desc: '데이터를 분석해줘요' },
  { id: 'companion', name: '동반자', price: 500, desc: '언제든 함께해요' },
];

export default function SkillMarketPage() {
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
      alert('코인이 부족합니다!');
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
        alert(coinError.message || '구매 실패');
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
      
      alert('스킬을 획득했습니다!');
    } catch (err) {
      alert('구매 중 오류가 발생했습니다.');
    }
    setBuying(null);
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">스킬 상점</h1>
        <p className="text-white/60 text-sm mb-6">결의 새로운 능력을 해제하세요</p>
        
        {/* 코인 */}
        <div className="mb-6 p-3 bg-white/5 rounded-lg flex justify-between items-center">
          <span className="text-white/60">보유 코인</span>
          <span className="text-xl font-bold text-point">{coins}</span>
        </div>
        
        <div className="space-y-3">
          {SKILLS.map((skill) => (
            <div key={skill.id} className="p-4 bg-white/5 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-medium">{skill.name}</h3>
                <p className="text-xs text-white/40">{skill.desc}</p>
              </div>
              <button
                onClick={() => buySkill(skill.id)}
                disabled={buying === skill.id}
                className="bg-point/20 hover:bg-point/40 text-point px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {skill.price} 코인
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
