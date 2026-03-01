/**
 * Main Page - GYEOL 메인 페이지
 * 탄생 시퀀스 또는 채팅 페이지
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';
import ChatInterface from '@/components/ChatInterface';
import { BirthSequence } from '@/components/BirthSequence';
import { EnergyBar, IntimacyDisplay } from '@/components/EnergyBar';
import { EvolutionCeremony } from '@/components/EvolutionCeremony';

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'), { ssr: false });

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [showBirth, setShowBirth] = useState(false);
  const [ready, setReady] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const prevGenRef = useRef(1);
  const router = useRouter();
  
  const { 
    userId, 
    setUserId, 
    agent,
    agentStatus,
    setAgent,
    setAgentStatus,
    setMessages,
    setIsGuest 
  } = useGyeolStore();
  
  const supabase = createClient();
  
  const init = useCallback(async () => {
    if (!supabase) {
      setShowBirth(true);
      setIsLoading(false);
      return;
    }
    
    try {
      // Supabase Anonymous Sign-In
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 익명 로그인
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Anonymous sign-in error:', error);
          setShowBirth(true);
          setIsLoading(false);
          return;
        }
      }
      
      // 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setShowBirth(true);
        setIsLoading(false);
        return;
      }
      
      const uid = user.id;
      const isGuest = user.is_anonymous ?? true;
      
      setUserId(uid);
      setIsGuest(isGuest);
      
      // 에이전트 조회
      const { data: agt } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', uid)
        .single();
      
      if (!agt) {
        setShowBirth(true);
        setIsLoading(false);
        return;
      }
      
      setAgent(agt);
      
      // 진화 체크: gen이 증가했는지 확인
      if (agt.gen > prevGenRef.current) {
        setShowEvolution(true);
      }
      prevGenRef.current = agt.gen;
      
      const { data: msgs } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agt.id)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (msgs) setMessages(msgs);
      
      // 에이전트 상태 조회
      if (agt) {
        const { data: status } = await supabase
          .from('agent_status')
          .select('*')
          .eq('agent_id', agt.id)
          .single();
        
        if (status) {
          setAgentStatus({
            condition: status.condition || 'normal',
            mood: status.mood || 'neutral',
            energy: status.energy || 100,
            intimacy_score: status.intimacy_score || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading agent:', error);
      setShowBirth(true);
    }
    
    setIsLoading(false);
  }, [supabase, setUserId, setIsGuest, setAgent, setAgentStatus, setMessages]);
  
  // Realtime 구독
  useEffect(() => {
    if (!supabase || !agent) return;
    
    const channel = supabase
      .channel('agent-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${agent.id}`,
        },
        (payload) => {
          console.log('Agent changed:', payload);
          if (payload.new) {
            setAgent(payload.new as any);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_status',
          filter: `agent_id=eq.${agent.id}`,
        },
        (payload) => {
          console.log('Status changed:', payload);
          if (payload.new) {
            const newStatus = payload.new as any;
            setAgentStatus({
              condition: newStatus.condition || 'normal',
              mood: newStatus.mood || 'neutral',
              energy: newStatus.energy || 100,
              intimacy_score: newStatus.intimacy_score || 0,
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, agent, setAgent, setAgentStatus]);
  
  useEffect(() => {
    if (supabase) {
      setReady(true);
      init();
    }
  }, [supabase, init]);
  
  async function onBirthComplete(createdAgent: any) {
    setAgent(createdAgent);
    setShowBirth(false);
  }
  
  if (isLoading || !ready) {
    return (
      <main className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 animate-pulse">결을 불러오는 중...</div>
      </main>
    );
  }
  
  if (showBirth || !agent) {
    return <BirthSequence userId={userId || ''} onComplete={onBirthComplete} />;
  }
  
  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      <VoidCanvas agent={agent} isThinking={false} mood={agentStatus?.mood || 'neutral'} />
      
      {/* 진화 세레모니 */}
      {showEvolution && (
        <EvolutionCeremony 
          isVisible={showEvolution}
          newGen={agent.gen} 
          onComplete={() => setShowEvolution(false)} 
        />
      )}
      
      <div className="absolute top-4 right-4 text-[10px] text-white/40 flex flex-col items-end gap-1">
        <div>Gen {agent.gen} · {agent.total_conversations} 대화 · {agent.name}</div>
        {agentStatus && (
          <div className="flex items-center gap-2">
            <EnergyBar energy={agentStatus.energy} condition={agentStatus.condition} />
            <IntimacyDisplay score={agentStatus.intimacy_score} />
          </div>
        )}
      </div>
      
      <ChatInterface />
    </main>
  );
}
