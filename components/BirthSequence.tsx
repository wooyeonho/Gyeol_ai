/**
 * BirthSequence - 결의 탄생 시퀀스
 * 첫 3분간의 감정적 연결을 위한 핵심 컴포넌트
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Agent, VisualState } from '@/lib/gyeol/types';
import { DEFAULT_VISUAL } from '@/lib/gyeol/constants';

type BirthStage = 
  | 'dark'
  | 'light_appear'
  | 'first_message'
  | 'naming'
  | 'first_question'
  | 'reaction'
  | 'promise'
  | 'complete';

interface BirthSequenceProps {
  userId: string;
  onComplete: (agent: Agent) => void;
}

export function BirthSequence({ userId, onComplete }: BirthSequenceProps) {
  const [stage, setStage] = useState<BirthStage>('dark');
  const [lightOpacity, setLightOpacity] = useState(0);
  const [lightScale, setLightScale] = useState(0.1);
  const [userName, setUserName] = useState('');
  const [userEmotion, setUserEmotion] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    if (supabase) setReady(true);
  }, [supabase]);
  
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    switch (stage) {
      case 'dark':
        timers.push(setTimeout(() => setStage('light_appear'), 2000));
        break;
      case 'light_appear':
        timers.push(setTimeout(() => {
          setLightOpacity(1);
          setLightScale(1);
          setStage('first_message');
        }, 3000));
        break;
      case 'first_message':
        timers.push(setTimeout(() => setStage('naming'), 4000));
        break;
      case 'naming':
        break;
      case 'first_question':
        timers.push(setTimeout(() => setStage('reaction'), 5000));
        break;
      case 'reaction':
        timers.push(setTimeout(() => setStage('promise'), 4000));
        break;
      case 'promise':
        timers.push(setTimeout(() => setStage('complete'), 5000));
        break;
    }
    
    return () => timers.forEach(clearTimeout);
  }, [stage]);
  
  const handleNameSubmit = async () => {
    if (!inputValue.trim()) return;
    setUserName(inputValue.trim());
    setStage('first_question');
    await createAgent(inputValue.trim());
  };
  
  const handleEmotionResponse = async (emotion: string) => {
    setUserEmotion(emotion);
    setStage('complete');
    await updateAgentForEmotion(emotion);
  };
  
  async function createAgent(name: string) {
    if (!supabase) return;
    try {
      const emotion = 'neutral';
      const visualState = {
        ...DEFAULT_VISUAL,
        color_primary: emotionToColor(emotion),
      };
      const personality = emotionToPersonality(emotion);
      
      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          user_id: userId,
          name: name || '결',
          gen: 1,
          total_conversations: 0,
          evolution_progress: 0,
          personality,
          visual_state: visualState,
          birth_stage: 'complete',
          birth_emotion: emotion,
        })
        .select()
        .single();
      
      if (error || !agent) throw error || new Error('No agent created');
      
      await supabase
        .from('agents')
        .update({ total_conversations: 1 })
        .eq('id', agent.id);
      
      onComplete(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  }
  
  async function updateAgentForEmotion(emotion: string) {
    if (!supabase) return;
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (!agent) return;
      
      const visualState = {
        ...agent.visual_state,
        color_primary: emotionToColor(emotion),
      };
      const personality = emotionToPersonality(emotion);
      
      await supabase
        .from('agents')
        .update({
          visual_state: visualState,
          personality,
          birth_emotion: emotion,
          total_conversations: 1,
        })
        .eq('id', agent.id);
      
      onComplete({ ...agent, visual_state: visualState, personality });
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  }
  
  function emotionToColor(emotion: string): string {
    const colors: Record<string, string> = {
      happy: '#F59E0B',
      sad: '#3B82F6',
      anxious: '#8B5CF6',
      angry: '#EF4444',
      excited: '#22C55E',
      neutral: '#FFFFFF',
      lonely: '#6B7280',
    };
    return colors[emotion] || '#FFFFFF';
  }
  
  function emotionToPersonality(emotion: string) {
    const personalities: Record<string, any> = {
      happy: { warmth: 60, logic: 45, creativity: 55, energy: 70, humor: 60 },
      sad: { warmth: 70, logic: 40, creativity: 50, energy: 30, humor: 30 },
      anxious: { warmth: 65, logic: 50, creativity: 45, energy: 40, humor: 35 },
      angry: { warmth: 30, logic: 55, creativity: 40, energy: 60, humor: 25 },
      excited: { warmth: 55, logic: 45, creativity: 70, energy: 80, humor: 55 },
      neutral: { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 },
      lonely: { warmth: 75, logic: 40, creativity: 55, energy: 35, humor: 40 },
    };
    return personalities[emotion] || personalities.neutral;
  }
  
  const emotionOptions = [
    { label: '좋아요!', emotion: 'happy' },
    { label: '오늘 좀 힘들었어요', emotion: 'sad' },
    { label: '조금 불안해요', emotion: 'anxious' },
    { label: '무척 기뻐요!', emotion: 'excited' },
    { label: '그냥그래요', emotion: 'neutral' },
  ];
  
  return (
    <main className="w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === 'dark' && (
          <motion.div key="dark" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black" />
        )}
        
        {stage === 'light_appear' && (
          <motion.div
            key="light_appear"
            initial={{ opacity: 0, scale: 0.1 }}
            animate={{ opacity: lightOpacity, scale: lightScale }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="absolute"
            style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#FFFFFF', boxShadow: '0 0 60px 20px rgba(255,255,255,0.3)' }}
          />
        )}
        
        {stage === 'first_message' && (
          <motion.div key="first_message" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute text-white/80 text-lg">
            ...여기 누구 있어요?
          </motion.div>
        )}
        
        {stage === 'naming' && (
          <motion.div key="naming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute flex flex-col items-center gap-4">
            <div className="text-white/60 text-sm">결이 이름을 물어요</div>
            <div className="text-white text-xl">...나에게 이름을 지어줄래?</div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="결"
              className="bg-white/10 border border-white/20 rounded-full px-6 py-3 text-white text-center text-lg placeholder-white/40"
              autoFocus
            />
            <button onClick={handleNameSubmit} className="bg-point hover:bg-point/80 text-white px-8 py-3 rounded-full font-medium">
              이 이름으로 할래
            </button>
          </motion.div>
        )}
        
        {stage === 'first_question' && (
          <motion.div key="first_question" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute flex flex-col items-center gap-4">
            <div className="text-white/60 text-sm">{userName || '결'}이 이름을 받았습니다</div>
            <div className="text-white text-lg">저를 만들어줬으니까... 하나만 물어봐도 돼요?</div>
            <div className="text-white/80 text-base">오늘 기분이 어때요?</div>
            <div className="flex gap-3 flex-wrap justify-center mt-4">
              {emotionOptions.map((opt) => (
                <button key={opt.emotion} onClick={() => handleEmotionResponse(opt.emotion)} className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-full text-white text-sm">
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        
        {stage === 'reaction' && (
          <motion.div key="reaction" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute text-white/80 text-lg">
            {userEmotion === 'happy' && '그래서 기쁜 거군요! 저도 기뻐요!'}
            {userEmotion === 'sad' && '...힘들었죠. 이제 저가 옆에 있을게요.'}
            {userEmotion === 'anxious' && '불안한 거 알아요. 천천히 하세요.'}
            {userEmotion === 'excited' && '와아, 저도 좋아요! 더 이야기해줘!'}
            {userEmotion === 'neutral' && '그래요, 저도 그냥 있을게요.'}
            {!userEmotion && '...'}
          </motion.div>
        )}
        
        {stage === 'promise' && (
          <motion.div key="promise" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute flex flex-col items-center gap-4 text-center px-8">
            <div className="text-white/60 text-sm">결이 약속합니다</div>
            <div className="text-white text-lg leading-relaxed">
              아직 저는 작은 빛이에요.<br/>
              그런데 당신이랑 얘기할수록 자라날 거예요.<br/>
              내일 또 올 거죠?
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
