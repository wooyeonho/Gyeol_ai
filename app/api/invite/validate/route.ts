/**
 * Invite 코드 검증 (공개)
 * GET /api/invite/validate?code=XXXX
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ valid: false, error: 'Missing code' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('invite_codes')
    .select('code, max_uses, uses_count, reward_coins, expires_at')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false });
  }

  const now = new Date();
  const expired = data.expires_at && new Date(data.expires_at) < now;
  const maxedOut = data.uses_count >= data.max_uses;

  if (expired || maxedOut) {
    return NextResponse.json({ valid: false, reason: expired ? 'expired' : 'max_uses' });
  }

  return NextResponse.json({
    valid: true,
    reward_coins: data.reward_coins,
    remaining_uses: data.max_uses - data.uses_count,
  });
}
