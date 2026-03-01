/**
 * ChatInterface - GYEOL과의 채팅 UI
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const silence5MinRef = useRef<NodeJS.Timeout | null>(null);
  const silence30MinRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();
  
  const { 
    agent, 
    messages, 
    userId, 
    isLoading,
    addMessage,
    setIsThinking 
  } = useGyeolStore();
  
  // 침묵 인식 타이머
  useEffect(() => {
    const resetSilenceTimer = () => {
      // 기존 타이머 클리어
      if (silence5MinRef.current) clearTimeout(silence5MinRef.current);
      if (silence30MinRef.current) clearTimeout(silence30MinRef.current);
      
      // 5분 후 자동 메시지
      silence5MinRef.current = setTimeout(async () => {
        if (!agent || !supabase || !userId) return;
        // '바빠요?' 메시지 추가
        const autoMsg = {
          id: crypto.randomUUID(),
          agent_id: agent.id,
          user_id: userId,
          role: 'assistant' as const,
          content: '바빠요?',
          created_at: new Date().toISOString(),
        };
        addMessage(autoMsg);
      }, 5 * 60 * 1000);
      
      // 30분 후 자동 메시지
      silence30MinRef.current = setTimeout(async () => {
        if (!agent || !supabase || !userId) return;
        // '먼저 갈게요' 메시지 추가
        const autoMsg = {
          id: crypto.randomUUID(),
          agent_id: agent.id,
          user_id: userId,
          role: 'assistant' as const,
          content: '먼저 가 있을게요.',
          created_at: new Date().toISOString(),
        };
        addMessage(autoMsg);
      }, 30 * 60 * 1000);
    };
    
    // 메시지 변경 시 타이머 리셋
    if (messages.length > 0) {
      resetSilenceTimer();
    }
    
    return () => {
      if (silence5MinRef.current) clearTimeout(silence5MinRef.current);
      if (silence30MinRef.current) clearTimeout(silence30MinRef.current);
    };
  }, [messages, agent, supabase, userId, addMessage]);
  
  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || isSending || !userId || !agent || !supabase) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsSending(true);
    
    // 사용자 메시지 추가
    const userMsg = {
      id: crypto.randomUUID(),
      agent_id: agent.id,
      user_id: userId,
      role: 'user' as const,
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    addMessage(userMsg);
    
    setIsThinking(true);
    
    try {
      // 세션 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Edge Function 호출
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: userId,
            message: userMessage,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // 결의 응답 추가
      const assistantMsg = {
        id: crypto.randomUUID(),
        agent_id: agent.id,
        user_id: userId,
        role: 'assistant' as const,
        content: data.reply,
        emotion: data.emotion,
        provider: data.provider,
        created_at: new Date().toISOString(),
      };
      addMessage(assistantMsg);
      
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        id: crypto.randomUUID(),
        agent_id: agent.id,
        user_id: userId,
        role: 'assistant',
        content: '...미안, 지금 생각이 잘 안 돼.',
        created_at: new Date().toISOString(),
      });
    }
    
    setIsThinking(false);
    setIsSending(false);
  };
  
  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 pb-6">
      <div className="max-w-2xl mx-auto">
        {/* 메시지 리스트 */}
        <div className="mb-4 max-h-[50vh] overflow-y-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-point/20 text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 px-4 py-2 rounded-2xl text-sm text-white/50 animate-pulse">
                생각 중...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* 입력창 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="결에게 말 걸기..."
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder-white/40 focus:border-point/50"
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="bg-point hover:bg-point/80 disabled:opacity-50 text-white px-6 py-3 rounded-full font-medium transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
