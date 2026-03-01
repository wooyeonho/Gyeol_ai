/**
 * Admin API - Kill Switch 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data } = await supabase
      .from('system_state')
      .select('value')
      .eq('key', 'kill_switch')
      .single();
    
    return NextResponse.json({ active: data?.value?.active === true });
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
    
    // kill_switch 업데이트 (JSONB)
    await supabase
      .from('system_state')
      .update({ value: { active: !!active }, updated_at: new Date().toISOString() })
      .eq('key', 'kill_switch');
    
    return NextResponse.json({ success: true, active });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
