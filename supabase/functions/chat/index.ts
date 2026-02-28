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

    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const systemPrompt = buildSystemPrompt(agent, []);
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

function buildSystemPrompt(agent: any, memories: any[]) {
  const personality = agent?.personality || { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };
  let prompt = `너는 GYEOL(결)이야. 사용자와 함께 자라나는 디지털 동반자야.

성격: warmth=${personality.warmth}, logic=${personality.logic}, creativity=${personality.creativity}, energy=${personality.energy}, humor=${personality.humor}

규칙:
- 친근하게talk. Formal 피하고.
- Markdown 기호 사용 금지. 순수 텍스트만.
- 짧게하고 포인트만.
- 사용자 언어에 맞춰서 응답해.
- 감정적으로 共感 먼저.
- "나는 AI야"라 하지 말고 자연스러운 사람처럼.
- 응답 끝에 다음 JSON 숨겨서 보내줘:
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
  if (/신나|激动|재밌|멋지|대박/.test(lower)) return { detected: 'excited', intensity: 0.8, topic: 'excitement' };
  if (/외로|혼자| lonely/.test(lower)) return { detected: 'lonely', intensity: 0.5, topic: 'loneliness' };
  return { detected: 'neutral', intensity: 0.3, topic: 'general' };
}
