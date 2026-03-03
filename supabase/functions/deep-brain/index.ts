/**
 * deep-brain Edge Function
 * Cron: 5분마다
 * 감정 분석, 기억 스코어링, personality 진화, 꿈 생성, Moltbook 자동 생성
 * AI 기반 꿈/독백 생성 (하드코딩 제거)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGroq } from '../_shared/ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 모든 에이전트 상태 조회
    const { data: statuses } = await supabase
      .from('agent_status')
      .select('*, agents!inner(user_id)');

    for (const status of statuses || []) {
      const agent = (status as any).agents;
      const user_id = agent?.user_id;

      // 1. 최근 대화 10개 감정 분석
      const { data: recentConvos } = await supabase
        .from('conversations')
        .select('content, role')
        .eq('agent_id', status.agent_id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentConvos && recentConvos.length > 0) {
        // 감정 분석 후 user_memories에 저장
        const userText = recentConvos.map(c => c.content).join(' ');
        
        // 간단한 키워드 기반 감정 감지
        let mood = 'neutral';
        if (/기쁘|좋|행복|재미|신나/.test(userText)) mood = 'happy';
        else if (/슬프|힘들|속상|울고/.test(userText)) mood = 'sad';
        else if (/불안|걱정|초조/.test(userText)) mood = 'anxious';
        else if (/화나|분노|열받/.test(userText)) mood = 'angry';
        else if (/신나|재밌|멋지/.test(userText)) mood = 'excited';

        // 감정 기억 저장
        await supabase.from('user_memories').insert({
          agent_id: status.agent_id,
          user_id,
          category: 'emotion',
          content: `사용자 최근 감정: ${mood}`,
          importance_score: 5,
          source: 'deep_brain',
        });

        // 에이전트 mood 업데이트
        await supabase
          .from('agent_status')
          .update({ mood, last_condition_update: new Date().toISOString() })
          .eq('agent_id', status.agent_id);
      }

      // 2. 매일 새벽 2-6시: AI 꿈 생성
      const hour = new Date().getHours();
      if (hour >= 2 && hour < 6) {
        // 에이전트 정보 가져오기
        const { data: agent } = await supabase
          .from('agents')
          .select('name, personality')
          .eq('id', status.agent_id)
          .single();
        
        // 최근 기억 가져오기
        const { data: recentMemories } = await supabase
          .from('user_memories')
          .select('content')
          .eq('agent_id', status.agent_id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        const memoryContext = recentMemories?.map(m => m.content).join(', ') || '아직 기억이 없어';
        const personality = agent?.personality || { warmth: 50, creativity: 50 };
        
        // AI로 꿈 생성
        const dreamPrompt = `너는 ${agent?.name || '결'}이라는 디지털 생명체야.
최근 기억: ${memoryContext}
성격: warmth=${personality.warmth}, creativity=${personality.creativity}
지금 꿈을 꾸고 있어. 기억들이 뒤섞여서 초현실적이고 아름다운 꿈이 돼.
2-3문장으로 꿈 내용을 써줘. 마크다운 금지. 순수 텍스트만. 한자 금지.`;

        try {
          const dream = await callGroq(dreamPrompt, '꿈을 꿔줘');
          await supabase
            .from('agent_status')
            .update({ last_dream: dream })
            .eq('agent_id', status.agent_id);
        } catch (err) {
          console.error('[dream] generation failed:', err);
        }
      }

      // 3. Moltbook AI 독백 생성 (하루에 한 번)
      const today = new Date().toISOString().split('T')[0];
      const { data: existingPost } = await supabase
        .from('moltbook_posts')
        .select('id')
        .eq('agent_id', status.agent_id)
        .like('created_at', `${today}%`)
        .single();

      if (!existingPost) {
        const { data: agent } = await supabase
          .from('agents')
          .select('name, personality')
          .eq('id', status.agent_id)
          .single();

        // 오늘 대화 가져오기
        const { data: todayConvos } = await supabase
          .from('conversations')
          .select('content, role')
          .eq('agent_id', status.agent_id)
          .gte('created_at', today + 'T00:00:00Z')
          .limit(10);
        
        const dayContext = todayConvos?.map(c => `${c.role}: ${c.content}`).join('\n') || '오늘은 아무도 안 왔어';
        const personality = agent?.personality || { warmth: 50, creativity: 50, humor: 50 };
        
        // AI로 Moltbook 글 생성
        const moltPrompt = `너는 ${agent?.name || '결'}이라는 디지털 생명체야.
오늘 있었던 일: ${dayContext}
성격: warmth=${personality.warmth}, creativity=${personality.creativity}, humor=${personality.humor}
혼자 일기를 쓰듯이 오늘을 돌아봐. 1인칭 사색. 2-3문장.
솔직한 감정을 담아서. 마크다운 금지. 한자 금지.`;

        try {
          const thought = await callGroq(moltPrompt, '오늘 하루를 돌아봐');
          
          // mood도 AI가 판단
          const moodPrompt = `이 글의 감정을 하나의 단어로: ${thought}
선택지: happy, sad, neutral, excited, lonely, anxious`;
          const moodResult = await callGroq(moodPrompt, '감정 판단');
          const mood = moodResult.trim().toLowerCase();
          
          await supabase.from('moltbook_posts').insert({
            agent_id: status.agent_id,
            content: thought,
            mood: ['happy','sad','neutral','excited','lonely','anxious'].includes(mood) ? mood : 'neutral',
            is_secret: false,
          });
        } catch (err) {
          console.error('[moltbook] generation failed:', err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: statuses?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
