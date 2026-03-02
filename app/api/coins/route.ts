/**
 * Coins API - 코인 구매/조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, amount, reason } = await request.json();
    
    if (!user_id || !amount) {
      return NextResponse.json({ error: 'user_id and amount required' }, { status: 400 });
    }
    
    // 기존 코인 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user_id)
      .single();
    
    const currentCoins = profile?.coins || 0;
    
    // 코인 차감 시 잔액 음수 방지
    if (amount < 0 && currentCoins + amount < 0) {
      return NextResponse.json({ 
        error: '코인이 부족합니다', 
        code: 'INSUFFICIENT_COINS' 
      }, { status: 400 });
    }
    
    const newBalance = currentCoins + amount;
    
    // 코인 업데이트
    await supabase
      .from('profiles')
      .update({ coins: newBalance })
      .eq('id', user_id);
    
    // 거래 내역 저장
    await supabase.from('coin_transactions').insert({
      user_id,
      amount,
      reason: reason || '코인 거래',
      type: amount > 0 ? 'reward' : 'spend',
    });
    
    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const user_id = request.nextUrl.searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }
    
    const { data } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user_id)
      .single();
    
    return NextResponse.json({ coins: data?.coins || 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
