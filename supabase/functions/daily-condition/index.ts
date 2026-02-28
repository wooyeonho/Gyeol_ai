/**
 * daily-condition Edge Function
 * Cron: 매일 자정
 * 에이전트 컨디션 랜덤 생성
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONDITIONS = ['good', 'normal', 'bad'];

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
    const { data: statuses, error } = await supabase
      .from('agent_status')
      .select('agent_id');

    if (error) throw error;

    // 각 에이전트 컨디션 랜덤 업데이트
    for (const status of statuses || []) {
      const newCondition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
      const newEnergy = Math.floor(Math.random() * 21) + 80; // 80-100

      await supabase
        .from('agent_status')
        .update({
          condition: newCondition,
          energy: newEnergy,
          last_condition_update: new Date().toISOString(),
        })
        .eq('agent_id', status.agent_id);
    }

    return new Response(JSON.stringify({ success: true, updated: statuses?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
