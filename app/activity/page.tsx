/**
 * Activity Page - 활동 기록
 */

'use client';

import { useEffect, useState } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { ActivityFeed } from '@/components/ActivityFeed';

export default function ActivityPage() {
  const { agent } = useGyeolStore();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (agent) setLoading(false);
  }, [agent]);
  
  if (loading || !agent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">결의 활동</h1>
        <div className="mb-6 text-sm text-white/60">
          Gen {agent.gen} · {agent.name}
        </div>
        <ActivityFeed agentId={agent.id} />
      </div>
    </div>
  );
}
