/**
 * Invite 코드 생성
 * POST /api/invite/create
 * Body: { max_uses?: number, reward_coins?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const maxUses = Math.min(body.max_uses ?? 5, 100);
    const rewardCoins = Math.min(body.reward_coins ?? 10, 500);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      const { data: existing } = await admin.from('invite_codes').select('code').eq('code', code).single();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json({ error: 'Code generation failed' }, { status: 500 });
    }

    await admin.from('invite_codes').insert({
      code,
      inviter_id: user.id,
      max_uses: maxUses,
      reward_coins: rewardCoins,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const inviteUrl = `${siteUrl}/login?ref=${code}`;

    return NextResponse.json({ code, invite_url: inviteUrl });
  } catch (error) {
    console.error('Invite create error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
