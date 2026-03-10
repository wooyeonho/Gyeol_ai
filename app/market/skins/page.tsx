/**
 * Skin Market - 스킨 상점
 * GYEOL의 비주얼 스킨 구매
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

const SKINS = [
  { id: 'star', nameKey: 'star', price: 0, color: '#F59E0B', descKey: 'starDesc' },
  { id: 'ocean', nameKey: 'ocean', price: 100, color: '#06B6D4', descKey: 'oceanDesc' },
  { id: 'flame', nameKey: 'flame', price: 150, color: '#EF4444', descKey: 'flameDesc' },
  { id: 'forest', nameKey: 'forest', price: 150, color: '#22C55E', descKey: 'forestDesc' },
  { id: 'nebula', nameKey: 'nebula', price: 300, color: '#A855F7', descKey: 'nebulaDesc' },
  { id: 'crystal', nameKey: 'crystal', price: 500, color: '#EAB308', descKey: 'crystalDesc' },
];

export default function SkinMarketPage() {
  const t = useTranslations('market');
  const tSkins = useTranslations('market.skins');
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
      alert(t('insufficientCoins'));
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
        alert(coinError.message || t('buyFailed'));
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
      
      alert(t('skinApplied'));
    } catch (err) {
      alert(t('buyError'));
    }
    setBuying(null);
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">{t('skinsTitle')}</h1>
        <p className="text-white/60 text-sm mb-6">{t('skinsDesc')}</p>
        
        <div className="mb-6 p-3 bg-white/5 rounded-lg flex justify-between items-center">
          <span className="text-white/60">{t('balance')}</span>
          <span className="text-xl font-bold text-point">{coins}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {SKINS.map((skin) => (
            <div key={skin.id} className="p-4 bg-white/5 rounded-lg">
              <div 
                className="w-full h-20 rounded-lg mb-3"
                style={{ backgroundColor: skin.color }}
              />
              <h3 className="font-medium">{tSkins(skin.nameKey)}</h3>
              <p className="text-xs text-white/40 mb-3">{tSkins(skin.descKey)}</p>
              <button
                onClick={() => buySkin(skin.id)}
                disabled={buying === skin.id}
                className="w-full bg-point/20 hover:bg-point/40 text-point py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {skin.price === 0 ? t('free') : t('coins', { price: skin.price })}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
