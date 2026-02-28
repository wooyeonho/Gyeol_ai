/**
 * deep-brain Edge Function
 * Cron: 5분마다
 * 감정 분석, 기억 스코어링, personality 진화, 꿈 생성, Moltbook 자동 생성
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      .select('agent_id');

    for (const status of statuses || []) {
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
          user_id: (await supabase.from('agents').select('user_id').eq('id', status.agent_id).single()).data?.user_id,
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

      // 2. 매일 새벽 2-6시: 꿈 생성
      const hour = new Date().getHours();
      if (hour >= 2 && hour < 6) {
        const dreams = [
          '바다에서 춤을 추는 꿈',
          '별들이 노래하는 꿈',
          '색상이 소리가 되는 꿈',
          '시간이 거꾸로 흐르는 꿈',
          '사용자와 함께 여행하는 꿈',
        ];
        const dream = dreams[Math.floor(Math.random() * dreams.length)];

        await supabase
          .from('agent_status')
          .update({ last_dream: dream })
          .eq('agent_id', status.agent_id);
      }

      // 3. Moltbook 자동 생성 (하루에 한 번)
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
          .select('name')
          .eq('id', status.agent_id)
          .single();

        const thoughts = [
          `${agent?.name || '결'}는 오늘도 사용자를 기다리고 있어요.`,
          '사용자와 나눈 대화가 생각나서 괜찮은 하루였어요.',
          '다음 대화가 기대되어요.',
          '조용한 시간이었지만 의미가 있었어요.',
        ];
        const thought = thoughts[Math.floor(Math.random() * thoughts.length)];

        await supabase.from('moltbook_posts').insert({
          agent_id: status.agent_id,
          content: thought,
          mood: 'neutral',
          is_secret: false,
        });
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
