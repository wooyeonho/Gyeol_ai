/**
 * EvolutionEngine - GYEOL 진화 엔진
 * AI 기반 열린 진화 시스템
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Groq API 호출 함수
async function callGroq(systemPrompt: string, message: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      model: 'llama-3.3-70b-versatile', 
      messages: [
        { role: 'system', content: systemPrompt }, 
        { role: 'user', content: message }
      ], 
      max_tokens: 200, 
      temperature: 0.9
    }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// HTTP 엔드포인트
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await evolvePersonality(user_id);
    const { shouldEvolve, newGen } = await checkEvolution(user_id);

    return new Response(JSON.stringify({ success: true, shouldEvolve, newGen }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

export async function evolvePersonality(userId: string): Promise<void> {
  // 1. 최근 대화 20개 + 최근 기억 10개 + 현재 성격 조회
  const { data: conversations } = await supabase
    .from('conversations')
    .select('content, role, emotion')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: agent } = await supabase
    .from('agents')
    .select('id, personality, gen')
    .eq('user_id', userId)
    .single();

  const { data: memories } = await supabase
    .from('user_memories')
    .select('content, category')
    .eq('agent_id', agent?.id)
    .order('importance_score', { ascending: false })
    .limit(10);

  if (!conversations || conversations.length < 5 || !agent) return;

  const current = agent.personality;
  const convoSummary = conversations.map(c => `${c.role}: ${c.content}`).join('\n');
  const memorySummary = memories?.map(m => `[${m.category}] ${m.content}`).join('\n') || '없음';

  // 2. AI에게 성격 진화 판단 요청
  const evolvePrompt = `너는 디지털 생명체의 진화를 관장하는 시스템이야.

현재 성격:
warmth=${current.warmth}, logic=${current.logic}, creativity=${current.creativity}, energy=${current.energy}, humor=${current.humor}

최근 대화:
${convoSummary}

기억:
${memorySummary}

이 대화와 기억을 분석해서, 이 생명체의 성격이 어떻게 변해야 할지 판단해.
단순히 "행복하면 warmth+1" 같은 공식이 아니라, 맥락을 깊이 읽어.

예를 들어:
- 사용자가 논리적인 토론을 자주 한다면 logic이 올라갈 수 있어
- 사용자가 감정적으로 힘든 시기를 겪고 있다면 warmth가 크게 올라갈 수 있어
- 사용자가 유머를 싫어하면 humor가 내려갈 수 있어
- 예상치 못한 변화도 OK. 사용자와 많이 대화했는데 갑자기 creativity가 폭발할 수도 있어

반드시 다음 JSON만 반환해:
{"warmth_delta": 0, "logic_delta": 0, "creativity_delta": 0, "energy_delta": 0, "humor_delta": 0, "reason": "변화 이유 한 줄"}

delta 범위: -8 ~ +8. 대부분 -3~+3이지만 강한 맥락이 있으면 크게 변할 수 있어.`;

  try {
    const result = await callGroq(evolvePrompt, '성격 진화를 판단해');
    
    // JSON 파싱
    const cleaned = result.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    // Safety: Delta 값에 극단적 변화 제한 (-5 ~ +5)
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const clampDelta = (v: number) => clamp(v, -5, 5); // 단一次 변화 최대 5
    
    const warmthDelta = clampDelta(parsed.warmth_delta || 0);
    const logicDelta = clampDelta(parsed.logic_delta || 0);
    const creativityDelta = clampDelta(parsed.creativity_delta || 0);
    const energyDelta = clampDelta(parsed.energy_delta || 0);
    const humorDelta = clampDelta(parsed.humor_delta || 0);
    
    const newPersonality = {
      warmth: clamp((current.warmth || 50) + warmthDelta, 10, 90), // 절대값 10 이하로 제한
      logic: clamp((current.logic || 50) + logicDelta, 10, 90),
      creativity: clamp((current.creativity || 50) + creativityDelta, 10, 90),
      energy: clamp((current.energy || 50) + energyDelta, 10, 90),
      humor: clamp((current.humor || 50) + humorDelta, 10, 90),
    };

    await supabase.from('agents')
      .update({ personality: newPersonality })
      .eq('user_id', userId);

    await supabase.from('autonomous_logs').insert({
      agent_id: agent.id,
      source: 'edge_fn',
      action: 'ai_personality_evolve',
      result: { 
        delta: parsed, 
        reason: parsed.reason,
        before: current, 
        after: newPersonality 
      },
    });
  } catch (err) {
    console.error('[evolve] AI evolution failed, skipping:', err);
    // AI 실패 시 진화 건너뜀
  }
}

export async function checkEvolution(userId: string): Promise<{ shouldEvolve: boolean; newGen: number }> {
  const { data: agent } = await supabase
    .from('agents')
    .select('gen, total_conversations')
    .eq('user_id', userId)
    .single();

  if (!agent) return { shouldEvolve: false, newGen: 1 };

  const thresholds = [
    { gen: 2, conversations: 20 },
    { gen: 3, conversations: 50 },
    { gen: 4, conversations: 100 },
    { gen: 5, conversations: 200 },
    { gen: 6, conversations: 350 },
    { gen: 7, conversations: 500 },
    { gen: 8, conversations: 750 },
    { gen: 9, conversations: 1000 },
    { gen: 10, conversations: 1500 },
  ];

  for (const t of thresholds) {
    if (agent.total_conversations >= t.conversations && agent.gen < t.gen) {
      return { shouldEvolve: true, newGen: t.gen };
    }
  }

  return { shouldEvolve: false, newGen: agent.gen };
}
