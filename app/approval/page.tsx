/**
 * ApprovalPage - 결의 변경 요청 승인
 * GYEOL이 스스로 바꾸고 싶은 것들을 주인이 승인
 */

'use client';

import { useState, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';
import { ApprovalRequest } from '@/lib/gyeol/types';

export default function ApprovalPage() {
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
    if (!supabase) return;
    await supabase.from('approval_queue').update({ status: 'approved', resolved_at: new Date().toISOString() }).eq('id', id);
    setApprovals(approvals.filter(a => a.id !== id));
  }
  
  async function handleDeny(id: string) {
    if (!supabase) return;
    await supabase.from('approval_queue').update({ status: 'denied', resolved_at: new Date().toISOString() }).eq('id', id);
    setApprovals(approvals.filter(a => a.id !== id));
  }
  
  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">로딩 중...</div>;
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">승인 요청</h1>
        
        {approvals.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            대기 중인 요청이 없어요
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
                    승인
                  </button>
                  <button
                    onClick={() => handleDeny(approval.id)}
                    className="flex-1 bg-red-600 py-2 rounded-lg text-sm"
                  >
                    거절
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
