/**
 * ApprovalPage - 결의 변경 요청 승인
 * GYEOL이 스스로 바꾸고 싶은 것들을 주인이 승인
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';
import { ApprovalRequest } from '@/lib/gyeol/types';

export default function ApprovalPage() {
  const t = useTranslations('approval');
  const tCommon = useTranslations('common');
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { agent } = useGyeolStore();
  const supabase = createClient();
  
  useEffect(() => {
    if (supabase && agent) loadApprovals();
  }, [supabase, agent]);
  
  async function loadApprovals() {
    if (!supabase || !agent) return;
    try {
      const { data } = await supabase
        .from('approval_queue')
        .select('*')
        .eq('user_id', agent.user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data) setApprovals(data);
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleApprove(id: string) {
    if (!supabase || !agent) return;
    
    // 승인된 요청 정보 가져오기
    const approval = approvals.find(a => a.id === id);
    if (!approval) return;
    
    try {
      const getVal = (): string | undefined => {
        if (approval.new_value) return approval.new_value;
        const ps = approval.proposed_state;
        if (typeof ps === 'string') return ps;
        if (ps && typeof ps === 'object') {
          if (approval.change_type === 'name' && 'name' in ps) return String(ps.name);
          if (approval.change_type === 'personality' && 'personality' in ps) return JSON.stringify(ps.personality);
          if (approval.change_type === 'mood' && 'mood' in ps) return String(ps.mood);
          if (approval.change_type === 'condition' && 'condition' in ps) return String(ps.condition);
          return JSON.stringify(ps);
        }
        return undefined;
      };
      const val = getVal();
      if (!val) return;
      if (approval.change_type === 'name') {
        await supabase.from('agents').update({ name: val }).eq('id', agent.id);
      } else if (approval.change_type === 'personality') {
        const newPersonality = JSON.parse(val);
        await supabase.from('agents').update({ personality: newPersonality }).eq('id', agent.id);
      } else if (approval.change_type === 'mood') {
        await supabase.from('agent_status').update({ mood: val }).eq('agent_id', agent.id);
      } else if (approval.change_type === 'condition') {
        await supabase.from('agent_status').update({ condition: val }).eq('agent_id', agent.id);
      }
      
      // 상태 업데이트
      await supabase.from('approval_queue').update({ status: 'approved', resolved_at: new Date().toISOString() }).eq('id', id);
      setApprovals(approvals.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error applying approval:', error);
    }
  }
  
  async function handleDeny(id: string) {
    if (!supabase) return;
    await supabase.from('approval_queue').update({ status: 'denied', resolved_at: new Date().toISOString() }).eq('id', id);
    setApprovals(approvals.filter(a => a.id !== id));
  }
  
  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">{tCommon('loading')}</div>;
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
        
        {approvals.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            {t('empty')}
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div key={approval.id} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm bg-point/20 text-point px-2 py-1 rounded">
                    {approval.change_type}
                  </span>
                </div>
                <p className="text-white/80 mb-4">{approval.gyeol_reason}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(approval.id)}
                    className="flex-1 bg-green-600 py-2 rounded-lg text-sm"
                  >
                    {t('approve')}
                  </button>
                  <button
                    onClick={() => handleDeny(approval.id)}
                    className="flex-1 bg-red-600 py-2 rounded-lg text-sm"
                  >
                    {t('deny')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
