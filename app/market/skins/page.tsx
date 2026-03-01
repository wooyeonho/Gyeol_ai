/**
 * Skin Market - 스킨 상점
 * GYEOL의 비주얼 스킨 구매
 */

'use client';

import { useState, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

const SKINS = [
  { id: 'star', name: '별', price: 0, color: '#F59E0B', desc: '밤하늘의 별' },
  { id: 'ocean', name: '바다', price: 100, color: '#06B6D4', desc: '깊은 바다의 빛' },
  { id: 'flame', name: '불꽃', price: 150, color: '#EF4444', desc: '타오르는 불꽃' },
  { id: 'forest', name: '숲', price: 150, color: '#22C55E', desc: '깊은 숲의 빛' },
  { id: 'nebula', name: '성운', price: 300, color: '#A855F7', desc: '우주의 성운' },
  { id: 'crystal', name: '크리스탈', price: 500, color: '#EAB308', desc: '투명한 결정' },
];

export default function SkinMarketPage() {
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
  
  async function buySkin(skinId: string) {
    if (!supabase || !agent) return;
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin || skin.price > coins) {
      alert('코인이 부족합니다!');
      return;
    }
    
    setBuying(skinId);
    
    try {
      // 1. 코인 차감
      const { error: coinError } = await supabase.rpc('deduct_coins', { 
        p_user_id: agent.user_id, 
        p_amount: skin.price 
      });
      
      if (coinError) {
        alert(coinError.message || '구매 실패');
        setBuying(null);
        return;
      }
      
      // 2. 에이전트 visual_state 업데이트
      await supabase.from('agents').update({
        visual_state: {
          ...agent.visual_state,
          color_primary: skin.color,
        }
      }).eq('id', agent.id);
      
      // 3. 코인 상태 새로고침
      const { data: profile } = await supabase.from('profiles').select('coins').eq('id', agent.user_id).single();
      if (profile) setCoins(profile.coins);
      
      alert('스킨이 적용되었습니다!');
    } catch (err) {
      alert('구매 중 오류가 발생했습니다.');
    }
    setBuying(null);
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">스킨 상점</h1>
        <p className="text-white/60 text-sm mb-6">결의 외형을 바꿔보세요</p>
        
        {/* 코인 */}
        <div className="mb-6 p-3 bg-white/5 rounded-lg flex justify-between items-center">
          <span className="text-white/60">보유 코인</span>
          <span className="text-xl font-bold text-point">{coins}</span>
        </div>
        
        {/* 스킨 목록 */}
        <div className="grid grid-cols-2 gap-4">
          {SKINS.map((skin) => (
            <div key={skin.id} className="p-4 bg-white/5 rounded-lg">
              <div 
                className="w-full h-20 rounded-lg mb-3"
                style={{ backgroundColor: skin.color }}
              />
              <h3 className="font-medium">{skin.name}</h3>
              <p className="text-xs text-white/40 mb-3">{skin.desc}</p>
              <button
                onClick={() => buySkin(skin.id)}
                disabled={buying === skin.id}
                className="w-full bg-point/20 hover:bg-point/40 text-point py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {skin.price === 0 ? '무료' : `${skin.price} 코인`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
