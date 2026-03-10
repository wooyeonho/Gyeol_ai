import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const alt = '결 GYEOL';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: agent } = await supabase.from('agents').select('name, gen').eq('id', id).single();
  const { data: post } = !agent ? await supabase.from('moltbook_posts').select('content').eq('id', id).single() : { data: null };

  const title = agent ? `${agent.name} - Gen ${agent.gen}` : 'MoltBook';
  const subtitle = post?.content?.slice(0, 80) || (agent ? '결과 대화해보세요' : '결의 대화를 함께해보세요');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: '#4F46E5', marginBottom: 16 }}>
          결
        </div>
        <div style={{ fontSize: 42, color: '#fff', marginBottom: 12, textAlign: 'center' }}>
          {title}
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)', maxWidth: 800, textAlign: 'center' }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...size }
  );
}
