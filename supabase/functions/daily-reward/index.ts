/**
 * daily-reward Edge Function
 * Cron: 매일 자정
 * 로그인한 모든 사용자에게 10코인 지급
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

    // 모든 활성 사용자 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id');

    let rewardCount = 0;

    for (const profile of profiles || []) {
      // 코인 지급
      const { error: updateError } = await supabase.rpc('add_coins', {
        user_id: profile.id,
        amount: 10,
      });

      if (!updateError) {
        // 거래 내역 저장
        await supabase.from('coin_transactions').insert({
          user_id: profile.id,
          amount: 10,
          reason: '일일 보상',
          type: 'reward',
        });
        rewardCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, rewards: rewardCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
