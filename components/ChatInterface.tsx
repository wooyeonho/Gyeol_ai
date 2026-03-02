/**
 * ChatInterface - GYEOL과의 채팅 UI
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';

// 감정 분석 (서버와 동일한 로직)
function analyzeEmotion(text: string): { detected: string; intensity: number; topic: string } {
  const lower = text.toLowerCase();
  if (/기쁘|좋|행복|재미|신나|뿌듯/.test(lower)) return { detected: 'happy', intensity: 0.7, topic: 'positive' };
  if (/슬프|힘들|속상|울고|괴로/.test(lower)) return { detected: 'sad', intensity: 0.6, topic: 'negative' };
  if (/불안|걱정|초조/.test(lower)) return { detected: 'anxious', intensity: 0.5, topic: 'worry' };
  if (/화나|분노|열받|빡쳐/.test(lower)) return { detected: 'angry', intensity: 0.6, topic: 'frustration' };
  if (/신나|재밌|멋지|대박/.test(lower)) return { detected: 'excited', intensity: 0.8, topic: 'excitement' };
  if (/외로|혼자| lonely/.test(lower)) return { detected: 'lonely', intensity: 0.5, topic: 'loneliness' };
  return { detected: 'neutral', intensity: 0.3, topic: 'general' };
}

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
    updateMessage,
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
      
      const contentType = response.headers.get('content-type') || '';
      let reply = '';
      let emotion = { detected: 'neutral', intensity: 0.5, topic: '' };
      let tempId = '';
      
      if (contentType.includes('text/event-stream')) {
        // SSE 스트리밍 처리
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        
        const decoder = new TextDecoder();
        let buffer = '';
        
        // 즉시 화면에 표시
        tempId = crypto.randomUUID();
        addMessage({
          id: tempId,
          agent_id: agent.id,
          user_id: userId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
        });
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                reply += data;
                // 실시간으로 메시지 업데이트
                updateMessage(tempId, { content: reply });
              } catch {}
            }
          }
        }
        
        emotion = analyzeEmotion(reply);
      } else {
        // 일반 JSON 응답
        const data = await response.json();
        reply = data.reply || data.content || '';
        emotion = data.emotion || { detected: 'neutral', intensity: 0.5, topic: '' };
      }
      
      // 결의 응답 추가 (스트리밍으로 이미 표시된 경우 새 메시지 추가하지 않음)
      const assistantMsg = {
        id: crypto.randomUUID(),
        agent_id: agent.id,
        user_id: userId,
        role: 'assistant' as const,
        content: reply,
        emotion,
        provider: 'groq',
        created_at: new Date().toISOString(),
      };
      
      // 스트리밍으로 이미 표시된 경우 최종 메시지만 업데이트
      if (contentType.includes('text/event-stream')) {
        updateMessage(tempId, assistantMsg);
      } else {
        addMessage(assistantMsg);
      }
      
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
