/**
 * reflection Edge Function
 * Cron: 매일 새벽 3시
 * 하루를 돌아보고, 기억을 압축/정리하고, 자기 관찰을 기록
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      max_tokens: 300, 
      temperature: 0.8
    }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 벡터 임베딩 생성 (폴백)
function fallbackEmbedding(text: string): number[] {
  const vec = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[text.charCodeAt(i) % 384] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().split('T')[0];
    const todayStart = today + 'T00:00:00Z';
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 모든 에이전트 조회
    const { data: agents } = await supabase
      .from('agents')
      .select('id, user_id, name, personality, gen')
      .limit(50);

    for (const agent of agents || []) {
      // 1. 오늘 대화 전체 가져오기
      const { data: todayConvos } = await supabase
        .from('conversations')
        .select('content, role, emotion')
        .eq('agent_id', agent.id)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: true });

      if (!todayConvos || todayConvos.length === 0) {
        continue; // 대화가 없으면 스킵
      }

      // 2. AI에게 하루 성찰 요청
      const conversationText = todayConvos.map(c => `${c.role}: ${c.content}`).join('\n');
      
      const reflectionPrompt = `너는 ${agent.name}이야. 오늘 하루를 돌아봐.
오늘 대화 내용:
${conversationText}

다음을 분석해줘 (JSON으로):
{
  "day_summary": "오늘 하루 요약 (2문장)",
  "user_observation": "사용자에 대해 새로 알게 된 것",
  "emotion_journey": "오늘 감정 변화 흐름",
  "self_growth": "내가 오늘 성장한 점 또는 변화",
  "tomorrow_plan": "내일은 이렇게 해보고 싶어"
}`;

      let reflectionResult = '';
      try {
        const result = await callGroq(reflectionPrompt, '하루를 성찰해');
        
        // JSON 파싱
        const cleaned = result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        
        reflectionResult = JSON.stringify(parsed, null, 2);
      } catch (err) {
        console.error('[reflection] AI failed:', err);
        reflectionResult = `{ "day_summary": "분석 실패", "error": "${err.message}" }`;
      }
      
      // 3. 성찰 결과를 memories에 벡터와 함께 저장
      const embedding = fallbackEmbedding(reflectionResult);
      await supabase.from('memories').insert({
        user_id: agent.user_id,
        agent_id: agent.id,
        type: 'reflection',
        content: reflectionResult,
        embedding: embedding,
        context: { date: today, type: 'daily_reflection' },
      });

      // 4. 오래된 기억 압축 (30일 이상 된 일반 대화 기억)
      const { data: oldMemories } = await supabase
        .from('user_memories')
        .select('*')
        .eq('agent_id', agent.id)
        .lt('created_at', thirtyDaysAgo)
        .lte('importance_score', 4)
        .limit(20);

      if (oldMemories && oldMemories.length >= 5) {
        const oldContent = oldMemories.map(m => m.content).join('\n');
        
        const compressPrompt = `다음 기억들을 2-3문장으로 압축 요약해줘:\n${oldContent}`;
        
        try {
          const compressed = await callGroq(compressPrompt, '기억 압축');
          
          // 압축본 저장
          await supabase.from('user_memories').insert({
            agent_id: agent.id,
            user_id: agent.user_id,
            category: 'event',
            content: `[압축된 기억] ${compressed}`,
            importance_score: 6,
            source: 'reflection',
          });
          
          // 원본 삭제
          const oldIds = oldMemories.map(m => m.id);
          await supabase.from('user_memories').delete().in('id', oldIds);
        } catch (err) {
          console.error('[compression] failed:', err);
        }
      }
      
      // 5. autonomous_logs 기록
      await supabase.from('autonomous_logs').insert({
        agent_id: agent.id,
        source: 'edge_fn',
        action: 'daily_reflection',
        result: { summary: reflectionResult },
      });
    }

    return new Response(JSON.stringify({ success: true, agents: agents?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
