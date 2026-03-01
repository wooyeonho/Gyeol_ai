/**
 * Admin API - Kill Switch 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 시스템 상태 테이블이 없으면 생성
async function ensureSystemStateTable(supabase: any) {
  const { error } = await supabase.from('system_state').select('id').limit(1);
  if (error && error.code === '42P01') { // 테이블 없음
    await supabase.from('system_state').insert({
      key: 'kill_switch',
      value: 'false',
    });
  }
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await ensureSystemStateTable(supabase);
    
    const { data } = await supabase
      .from('system_state')
      .select('value')
      .eq('key', 'kill_switch')
      .single();
    
    return NextResponse.json({ active: data?.value === 'true' });
  } catch (error) {
    return NextResponse.json({ active: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { active, token } = await request.json();
    
    // 토큰 검증
    const validToken = process.env.KILL_SWITCH_TOKEN;
    if (!validToken || token !== validToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    await ensureSystemStateTable(supabase);
    
    // kill_switch 업데이트
    await supabase
      .from('system_state')
      .update({ value: active ? 'true' : 'false' })
      .eq('key', 'kill_switch');
    
    return NextResponse.json({ success: true, active });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
