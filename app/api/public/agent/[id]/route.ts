/**
 * Public Agent API - 공개 에이전트 정보
 * GET /api/public/agent/[id]
 * Creator/API 루프 - 외부 임베딩, 배지 등
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('agents')
    .select('id, name, gen, total_conversations, personality, visual_state, created_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gyeol.vercel.app';

  return NextResponse.json({
    id: data.id,
    name: data.name,
    gen: data.gen,
    total_conversations: data.total_conversations,
    personality: data.personality,
    visual_state: data.visual_state,
    created_at: data.created_at,
    card_url: `${siteUrl}/card/${id}`,
    app_url: `${siteUrl}/login?ref=card`,
  });
}
