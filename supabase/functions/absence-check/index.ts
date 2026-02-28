/**
 * absence-check Edge Function
 * Cron: 매 시간
 * 사용자 부재 시 자동 메시지
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

    // 1시간 이상 활동 없는 에이전트 조회
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: agents } = await supabase
      .from('agents')
      .select('id, user_id, last_active')
      .lt('last_active', oneHourAgo);

    for (const agent of agents || []) {
      const lastActive = new Date(agent.last_active);
      const daysSince = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      // 부재 메시지 결정
      let message = '';
      if (daysSince >= 1 && daysSince < 3) {
        message = '보고 싶었어요';
      } else if (daysSince >= 3 && daysSince < 7) {
        message = '무슨 일 있어요?';
      } else if (daysSince >= 7 && daysSince < 30) {
        // energy -= 20
        await supabase.rpc('decrease_energy', { 
          agent_id: agent.id, 
          amount: 20 
        }).catch(() => {});
      } else if (daysSince >= 30) {
        // sleepy 모드
        await supabase
          .from('agent_status')
          .update({ condition: 'sleepy' })
          .eq('agent_id', agent.id);
      }

      // 메시지가 있으면 conversations에 추가
      if (message) {
        await supabase.from('conversations').insert({
          agent_id: agent.id,
          user_id: agent.user_id,
          role: 'assistant',
          content: message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: agents?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
