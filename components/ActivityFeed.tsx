/**
 * ActivityFeed - 결의 활동 기록 보기
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AutonomousLog } from '@/lib/gyeol/types';

// 액션별 한국어 라벨
const actionLabels: Record<string, string> = {
  'personality_evolve': '성격 변화',
  'ai_personality_evolve': 'AI 기반 성격 진화',
  'evolution': '진화!',
  'daily_reflection': '하루 성찰',
  'learner': '자율 학습',
  'curiosity': '호기심 활동',
  'emotion_analysis': '감정 분석',
  'moltbook_generated': '일기 작성',
  'dream': '꿈',
};

// result를 보기 좋게 변환
function formatResult(action: string, result: any): string {
  if (!result) return '';
  if (typeof result === 'string') return result.slice(0, 80);
  if (action === 'evolution' && result.from_gen !== undefined) {
    return `Gen ${result.from_gen} → Gen ${result.to_gen}`;
  }
  if (action === 'learner' && result.learned) return result.learned.slice(0, 80);
  if (action === 'daily_reflection' && result.summary) return result.summary.slice(0, 80);
  if (action === 'dream' && result.dream) return result.dream.slice(0, 80);
  return JSON.stringify(result).slice(0, 80);
}

interface ActivityFeedProps {
  agentId: string;
}

export function ActivityFeed({ agentId }: ActivityFeedProps) {
  const [logs, setLogs] = useState<AutonomousLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (supabase) setReady(true);
  }, [supabase]);
  
  useEffect(() => {
    if (ready && agentId) {
      loadLogs();
    }
  }, [agentId, ready]);
  
  async function loadLogs() {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('autonomous_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return <div className="text-white/50">로딩 중...</div>;
  }
  
  if (logs.length === 0) {
    return (
      <div className="text-white/40 text-center py-8">
        아직 결의 활동이 없어요.
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/40">
              {new Date(log.created_at).toLocaleString('ko-KR')}
            </span>
            <span className="text-xs bg-point/20 text-point px-2 py-0.5 rounded">
              {actionLabels[log.action] || log.action}
            </span>
          </div>
          <div className="text-sm text-white/80">
            {formatResult(log.action, log.result)}
          </div>
        </div>
      ))}
    </div>
  );
}
