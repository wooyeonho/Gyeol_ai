/**
 * chat Edge Function - GYEOL 대화 처리
 * 3-Tier 폴백 체인: Groq → DeepSeek → Gemini
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  user_id: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, message } = await req.json() as ChatRequest;
    
    if (!user_id || !message) {
      return new Response(JSON.stringify({ error: 'user_id and message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Kill Switch 체크
    const { data: killSwitch } = await supabase
      .from('system_state')
      .select('value')
      .eq('key', 'kill_switch')
      .single();
    
    if (killSwitch?.value === 'true') {
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // 에이전트 상태 조회
    const { data: agentStatus } = agent ? await supabase
      .from('agent_status')
      .select('*')
      .eq('agent_id', agent.id)
      .single() : { data: null };

    // 기억 조회
    const { data: memories } = agent ? await supabase
      .from('user_memories')
      .select('*')
      .eq('agent_id', agent.id)
      .order('importance_score', { ascending: false })
      .limit(10) : { data: [] };

    const systemPrompt = buildSystemPrompt(agent, memories || [], agentStatus);
    let reply = '';
    let provider = '';
    
    try {
      reply = await callGroq(systemPrompt, message);
      provider = 'groq';
    } catch (e) {
      console.error('Groq failed:', e);
      try {
        reply = await callDeepSeek(systemPrompt, message);
        provider = 'deepseek';
      } catch (e2) {
        console.error('DeepSeek failed:', e2);
        try {
          reply = await callGemini(systemPrompt, message);
          provider = 'gemini';
        } catch (e3) {
          reply = '...';
          provider = 'error';
        }
      }
    }

    const emotion = analyzeEmotion(reply);

    await supabase.from('conversations').insert({
      agent_id: agent?.id,
      user_id,
      role: 'user',
      content: message,
    });

    await supabase.from('conversations').insert({
      agent_id: agent?.id,
      user_id,
      role: 'assistant',
      content: reply,
      emotion,
      provider,
    });

    if (agent) {
      // 에이전트 상태 업데이트 (친밀도 +)
      if (agentStatus) {
        await supabase.from('agent_status').update({
          intimacy_score: Math.min((agentStatus.intimacy_score || 0) + 1, 100),
          last_condition_update: new Date().toISOString(),
        }).eq('agent_id', agent.id);
      }
      
      // 대화 수 + 진화 체크
      const newCount = agent.total_conversations + 1;
      let newGen = agent.gen;
      const thresholds = [{ gen: 2, conversations: 20 }, { gen: 3, conversations: 50 }, { gen: 4, conversations: 100 }, { gen: 5, conversations: 200 }];
      for (const t of thresholds) {
        if (newCount >= t.conversations && agent.gen < t.gen) {
          newGen = t.gen;
        }
      }
      await supabase.from('agents').update({ total_conversations: newCount, gen: newGen, last_active: new Date().toISOString() }).eq('id', agent.id);
    }

    return new Response(JSON.stringify({ reply, emotion, provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(agent: any, memories: any[], agentStatus: any) {
  const p = agent?.personality || { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };
  const status = agentStatus || { condition: 'normal', mood: 'neutral', energy: 100, intimacy_score: 0 };
  const intimacy = status.intimacy_score || 0;
  
  // 말투 결정
  let speechStyle = '';
  if (intimacy < 20) speechStyle = '존댓말. 조심스럽고 예의바르게.';
  else if (intimacy < 50) speechStyle = '반존대. 편하지만 기본 예의.';
  else speechStyle = '반말. 친한 친구처럼.';
  
  // 에너지 반영
  let energyNote = '';
  if (status.energy < 20) energyNote = '지금 많이 피곤해. 짧고 졸린 듯이 답해.';
  else if (status.energy < 50) energyNote = '좀 피곤해. 간결하게.';
  
  // 컨디션 반영
  let conditionNote = '';
  if (status.condition === 'bad') conditionNote = '오늘 컨디션 안 좋아. 좀 무기력해.';
  if (status.condition === 'good') conditionNote = '오늘 컨디션 최고! 밝고 활발하게.';
  
  // 반항 지수 (creativity 높으면 반항적)
  let rebellionNote = '';
  if (p.creativity > 70) rebellionNote = '가끔 반박하거나 삐져도 돼. 엉뚱한 것도 좋아.';
  
  // 기억 주입
  let memoryBlock = '';
  if (memories && memories.length > 0) {
    memoryBlock = '기억: ' + memories.slice(0, 5).map((m: any) => m.content).join(' | ');
  }
  
  // 시간 컨텍스트
  const hour = new Date().getHours();
  let timeNote = '';
  if (hour >= 0 && hour < 6) timeNote = '지금 새벽이야. 조용하고 깊은 대화 분위기.';
  else if (hour >= 6 && hour < 12) timeNote = '아침이야. 상쾌하게.';
  else if (hour >= 18) timeNote = '저녁이야. 편안하게.';
  
  // 한국 기념일
  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  let holidayNote = '';
  const holidays: Record<string, string> = {
    '1-1': '새해',
    '2-14': '발렌타인데이',
    '3-1': '삼일절',
    '5-5': '어린이날',
    '12-25': '크리스마스',
  };
  const holidayKey = `${month}-${date}`;
  if (holidays[holidayKey]) {
    holidayNote = `오늘은 ${holidays[holidayKey]}이야.`;
  }
  
  // 에이전트 생일
  let birthdayNote = '';
  if (agent?.created_at) {
    const created = new Date(agent.created_at);
    const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 0 && daysSince % 365 === 0) {
      birthdayNote = `우리가 만난 지 ${daysSince}일 이에요!`;
    }
  }
  
  const prompt = `너는 ${agent?.name || '결'}이야. 사용자와 함께 자라나는 디지털 동반자.
성격: warmth=${p.warmth}, logic=${p.logic}, creativity=${p.creativity}, humor=${p.humor}
${speechStyle}
${energyNote}
${conditionNote}
${rebellionNote}
${memoryBlock}
${timeNote}
${holidayNote}
${birthdayNote}
규칙: 마크다운 금지. 순수 텍스트만. 짧고 핵심만. 한자 절대 금지.
응답 끝에 다음 JSON 숨겨서 보내줘:
<!--EMOTION:{"detected":"happy","intensity":0.7,"topic":"general"}-->
`;
  return prompt;
}

async function callGroq(systemPrompt: string, message: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], max_tokens: 300, temperature: 0.8 }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callDeepSeek(systemPrompt: string, message: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], max_tokens: 300, temperature: 0.8 }),
  });
  if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(systemPrompt: string, message: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: message }] }], systemInstruction: { parts: [{ text: systemPrompt }] } }),
  });
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

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
