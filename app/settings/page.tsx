/**
 * Settings Page - 설정 페이지
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

function SettingsContent() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const { agent } = useGyeolStore();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('free');
  const [coins, setCoins] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    if (success === 'true') {
      setCheckoutMessage(t('checkoutSuccess'));
      if (supabase && agent) {
        supabase.from('profiles').select('tier').eq('id', agent.user_id).single()
          .then(({ data }) => data && setTier(data.tier || 'free'));
      }
    }
    if (canceled === 'true') setCheckoutMessage(null);
  }, [searchParams, supabase, agent]);

  useEffect(() => {
    if (!supabase || !agent) {
      if (agent) setLoading(false);
      return;
    }
    
    // 프로필에서 tier와 coins 조회
    supabase.from('profiles').select('tier, coins').eq('id', agent.user_id).single()
      .then(({ data }) => {
        if (data) {
          setTier(data.tier || 'free');
          setCoins(data.coins || 0);
        }
        setLoading(false);
      });
  }, [supabase, agent]);

  useEffect(() => {
    if (checkoutMessage) {
      const t = setTimeout(() => setCheckoutMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [checkoutMessage]);
  
  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>{tCommon('loading')}</div>
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
      
      alert(t('saved'));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async function handleUpgrade(tierPlan: 'pro' | 'premium') {
    setCheckoutLoading(tierPlan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : '결제를 시작할 수 없습니다.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Portal failed');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : '구독 관리 페이지를 열 수 없습니다.');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleCreateInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_uses: 5, reward_coins: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const url = data.invite_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${data.code}`;
      await navigator.clipboard.writeText(url);
      alert(t('inviteCreated'));
    } catch (e) {
      alert(e instanceof Error ? e.message : '초대 링크를 만들 수 없습니다.');
    } finally {
      setInviteLoading(false);
    }
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <LocaleSwitcher />
        </div>
        {checkoutMessage && (
          <div className="mb-4 p-3 bg-green-500/20 text-green-400 rounded-lg text-sm">
            {checkoutMessage}
          </div>
        )}
        {/* 결 정보 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t('gyeolInfo')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">{t('name')}</label>
              <input
                type="text"
                value={displayName || agent.name}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">{t('gen')}</label>
              <div className="text-2xl font-bold text-point">{t('gen')} {agent.gen}</div>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">{t('conversations')}</label>
              <div>{agent.total_conversations}</div>
            </div>
          </div>
        </section>
        
        {/* 성격 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t('personality')}</h2>
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
          <h2 className="text-lg font-semibold mb-4">{t('membership')}</h2>
          <div className="p-4 bg-white/5 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{tier === 'free' ? t('tierFree') : tier === 'pro' ? t('tierPro') : t('tierPremium')}</div>
                <div className="text-sm text-white/60">
                  {tier === 'free' ? t('tierLimitFree') : t('tierLimitPaid')}
                </div>
              </div>
              {tier !== 'free' ? (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="bg-white/20 px-4 py-2 rounded-lg text-sm hover:bg-white/30 disabled:opacity-50"
                >
                  {portalLoading ? '...' : t('manageSubscription')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={!!checkoutLoading}
                    className="bg-point px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    {checkoutLoading === 'pro' ? '...' : t('tierPro')}
                  </button>
                  <button
                    onClick={() => handleUpgrade('premium')}
                    disabled={!!checkoutLoading}
                    className="bg-point/80 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    {checkoutLoading === 'premium' ? '...' : t('tierPremium')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* 초대 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t('invite')}</h2>
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-white/60 mb-3">{t('inviteDesc')}</p>
            <button
              onClick={handleCreateInvite}
              disabled={inviteLoading}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {inviteLoading ? '...' : t('createInvite')}
            </button>
          </div>
        </section>
        
        {/* 코인 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t('coins')}</h2>
          <div className="p-4 bg-white/5 rounded-lg flex items-center justify-between">
            <div>
              <div className="font-medium text-point text-xl">{t('coinsCount', { count: coins })}</div>
              <div className="text-sm text-white/60">{t('coinsDesc')}</div>
            </div>
            <button className="bg-point px-4 py-2 rounded-lg text-sm opacity-60 cursor-not-allowed" disabled title={t('chargeComingSoon')}>
              {t('chargeComingSoon')}
            </button>
          </div>
        </section>
        
        <button
          onClick={saveSettings}
          className="w-full bg-point py-3 rounded-lg font-medium"
        >
          {tCommon('save')}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
