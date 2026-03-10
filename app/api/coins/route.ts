/**
 * Coins API - 코인 구매/조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 기반 클라이언트
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { amount, reason } = await request.json();
    
    if (!amount) {
      return NextResponse.json({ error: 'amount required' }, { status: 400 });
    }
    
    // 기존 코인 조회 (user.id 사용)
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single();
    
    const currentCoins = profile?.coins || 0;
    
    // 코인 차감 시 잔액 음수 방지
    if (amount < 0 && currentCoins + amount < 0) {
      return NextResponse.json({ 
        error: 'Insufficient coins', 
        code: 'INSUFFICIENT_COINS' 
      }, { status: 400 });
    }
    
    const newBalance = currentCoins + amount;
    
    // 코인 업데이트 (user.id 사용)
    await supabase
      .from('profiles')
      .update({ coins: newBalance })
      .eq('id', user.id);
    
    // 거래 내역 저장
    await supabase.from('coin_transactions').insert({
      user_id: user.id,
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
    // 사용자 인증 기반 클라이언트
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({ coins: data?.coins || 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
