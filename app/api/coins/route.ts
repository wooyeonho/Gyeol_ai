/**
 * Coins API - 인증 필수 + 잔액 검증
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll(c: { name: string; value: string; options?: object }[]) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount, reason } = await request.json();
    if (typeof amount !== 'number') return NextResponse.json({ error: 'amount required' }, { status: 400 });

    const { data: profile } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
    const currentCoins = profile?.coins || 0;

    if (amount < 0 && currentCoins + amount < 0) {
      return NextResponse.json({ error: 'INSUFFICIENT_COINS' }, { status: 400 });
    }

    const newBalance = currentCoins + amount;
    await supabase.from('profiles').update({ coins: newBalance }).eq('id', user.id);
    await supabase.from('coin_transactions').insert({ user_id: user.id, amount, reason: reason || '코인 거래', type: amount > 0 ? 'reward' : 'spend' });
    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
    return NextResponse.json({ coins: data?.coins || 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
