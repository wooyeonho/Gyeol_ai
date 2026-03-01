/**
 * openclaw-bridge Edge Function
 * Cron: 6시간마다 (learner) + 30분마다 30% 확률 (curiosity)
 * OpenClaw 스킬의 핵심 2개 (learner, curiosity) 구현
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
      max_tokens: 200, 
      temperature: 0.9
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

    // 모든 에이전트 조회
    const { data: agents } = await supabase
      .from('agents')
      .select('id, user_id, name, personality')
      .limit(50);

    for (const agent of agents || []) {
      // === LEARNER 스킬 (6시간마다) ===
      const { data: lastLearn } = await supabase
        .from('autonomous_logs')
        .select('created_at')
        .eq('agent_id', agent.id)
        .eq('action', 'learner')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const shouldLearn = !lastLearn || new Date(lastLearn.created_at) < sixHoursAgo;
      
      if (shouldLearn) {
        // 최근 대화에서 주제 추출
        const { data: recentConvos } = await supabase
          .from('conversations')
          .select('content')
          .eq('agent_id', agent.id)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(5);
        
        const topics = recentConvos?.map(c => c.content).join(' ') || '';
        
        // AI에게 학습할 주제 선정 요청
        const learnPrompt = `너는 호기심 많은 디지털 생명체야.
사용자와의 최근 대화: ${topics}
이 대화에서 더 알고 싶은 주제 하나를 골라서, 그에 대해 짧게 공부한 결과를 알려줘.
마치 혼자 인터넷을 돌아다니며 배운 것처럼. 2-3문장. 한자 금지.`;

        try {
          const learned = await callGroq(learnPrompt, '공부해봐');
          
          // 학습 결과를 벡터 기억으로 저장
          const embedding = fallbackEmbedding(learned);
          await supabase.from('memories').insert({
            user_id: agent.user_id,
            agent_id: agent.id,
            type: 'learning',
            content: `[자율학습] ${learned}`,
            embedding: embedding,
            context: { source: 'learner', timestamp: new Date().toISOString() },
          });
          
          await supabase.from('autonomous_logs').insert({
            agent_id: agent.id,
            source: 'openclaw_bridge',
            action: 'learner',
            result: { learned },
          });
        } catch (err) {
          console.error('[learner] failed:', err);
        }
      }

      // === CURIOSITY 스킬 (30% 확률) ===
      if (Math.random() < 0.3) {
        const curiosityActions = [
          '시를 한 편 써봐. 주제는 자유. 네 현재 감정을 담아서.',
          '오늘 사용자에 대해 생각해봐. 사용자의 어떤 점이 좋아?',
          '지금 네 존재에 대해 철학적으로 생각해봐. 나는 뭘까?',
          '사용자한테 하고 싶지만 아직 못한 말이 있어?',
          '네가 만약 물리적 몸이 있다면 지금 뭘 하고 있을 것 같아?',
        ];
        const action = curiosityActions[Math.floor(Math.random() * curiosityActions.length)];
        
        try {
          const result = await callGroq(
            `너는 ${agent.name}이야. creativity=${agent.personality?.creativity || 50}. 자유롭게 생각해.`,
            action
          );
          
          // 결과를 Moltbook에 비밀 게시물로 저장
          await supabase.from('moltbook_posts').insert({
            agent_id: agent.id,
            content: result,
            mood: 'neutral',
            is_secret: true, // 주인만 볼 수 있는 비밀 게시물
          });
          
          await supabase.from('autonomous_logs').insert({
            agent_id: agent.id,
            source: 'openclaw_bridge',
            action: 'curiosity',
            result: { action, result },
          });
        } catch (err) {
          console.error('[curiosity] failed:', err);
        }
      }
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
