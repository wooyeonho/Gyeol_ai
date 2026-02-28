/**
 * Admin API - Kill Switch 관리
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ active: false });
}

export async function POST(request: NextRequest) {
  try {
    const { active, token } = await request.json();
    
    if (token !== process.env.KILL_SWITCH_TOKEN) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    return NextResponse.json({ success: true, active });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
