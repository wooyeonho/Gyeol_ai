/**
 * Main Page - GYEOL 메인 페이지
 * 탄생 시퀀스 또는 채팅 페이지
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';
import ChatInterface from '@/components/ChatInterface';
import { BirthSequence } from '@/components/BirthSequence';

const VoidCanvas = dynamic(() => import('@/components/VoidCanvas'), { ssr: false });

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [showBirth, setShowBirth] = useState(false);
  const [ready, setReady] = useState(false);
  
  const { 
    userId, 
    setUserId, 
    agent, 
    setAgent, 
    setMessages,
    setIsGuest 
  } = useGyeolStore();
  
  const supabase = createClient();
  
  const init = useCallback(async () => {
    let uid = localStorage.getItem('gyeol_guest_id');
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem('gyeol_guest_id', uid);
    }
    setUserId(uid);
    setIsGuest(true);
    
    if (!supabase) {
      setShowBirth(true);
      setIsLoading(false);
      return;
    }
    
    try {
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
      
      const { data: msgs } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', agt.id)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (msgs) setMessages(msgs);
    } catch (error) {
      console.error('Error loading agent:', error);
      setShowBirth(true);
    }
    
    setIsLoading(false);
  }, [supabase, setUserId, setIsGuest, setAgent, setMessages]);
  
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
      <VoidCanvas agent={agent} isThinking={false} />
      
      <div className="absolute top-4 right-4 text-[10px] text-white/40">
        Gen {agent.gen} · {agent.total_conversations} 대화 · {agent.name}
      </div>
      
      <ChatInterface />
    </main>
  );
}
