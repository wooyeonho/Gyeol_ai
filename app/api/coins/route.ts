/**
 * Coins API - 코인 구매/조회
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { user_id, amount, reason } = await request.json();
    
    // TODO: 실제 Supabase에서 코인 업데이트
    // const supabase = createClient(...);
    // await supabase.from('coin_transactions').insert({ user_id, amount, reason });
    
    return NextResponse.json({ success: true, new_balance: 100 + amount });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user_id = request.nextUrl.searchParams.get('user_id');
    
    // TODO: 실제 Supabase에서 코인 조회
    // const supabase = createClient(...);
    // const { data } = await supabase.from('profiles').select('coins').eq('id', user_id).single();
    
    return NextResponse.json({ coins: 100 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
