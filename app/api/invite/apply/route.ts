/**
 * Invite 코드 적용 (가입 후 호출)
 * POST /api/invite/apply
 * Body: { code: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: invite } = await admin.from('invite_codes').select('*').eq('code', code.toUpperCase()).single();
    if (!invite) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    if (invite.uses_count >= invite.max_uses) {
      return NextResponse.json({ error: 'Code max uses reached' }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    if (invite.inviter_id === user.id) {
      return NextResponse.json({ error: 'Cannot use own code' }, { status: 400 });
    }

    const { data: existing } = await admin.from('referral_uses').select('id').eq('code', code).eq('referred_id', user.id).single();
    if (existing) {
      return NextResponse.json({ error: 'Already used' }, { status: 400 });
    }

    await admin.from('referral_uses').insert({
      code,
      inviter_id: invite.inviter_id,
      referred_id: user.id,
    });

    await admin.from('invite_codes').update({
      uses_count: invite.uses_count + 1,
    }).eq('code', code);

    const { data: profile } = await admin.from('profiles').select('coins').eq('id', user.id).single();
    const newCoins = (profile?.coins || 0) + invite.reward_coins;

    await admin.from('profiles').update({
      coins: newCoins,
      referred_by: invite.inviter_id,
      referral_code_used: code,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    await admin.from('coin_transactions').insert({
      user_id: user.id,
      amount: invite.reward_coins,
      reason: '초대 코드 보상',
      type: 'reward',
    });

    const inviterReward = Number((invite as any).inviter_reward_coins) || 5;
    if (inviterReward > 0) {
      const { data: inviterProfile } = await admin.from('profiles').select('coins').eq('id', invite.inviter_id).single();
      const inviterNewCoins = (inviterProfile?.coins || 0) + inviterReward;
      await admin.from('profiles').update({ coins: inviterNewCoins, updated_at: new Date().toISOString() }).eq('id', invite.inviter_id);
      await admin.from('coin_transactions').insert({
        user_id: invite.inviter_id,
        amount: inviterReward,
        reason: '친구 초대 보상',
        type: 'reward',
      });
    }

    return NextResponse.json({ success: true, reward_coins: invite.reward_coins, new_balance: newCoins });
  } catch (error) {
    console.error('Invite apply error:', error);
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 });
  }
}
