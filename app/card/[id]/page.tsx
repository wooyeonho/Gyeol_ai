/**
 * Public Card - 공개 에이전트/포스트 카드
 * OG 이미지 및 공유용
 */

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CardType = 'agent' | 'post';

async function getCard(id: string): Promise<{ type: CardType; data: any } | null> {
  const { data: agent } = await supabase.from('agents').select('id, name, gen, personality').eq('id', id).single();
  if (agent) return { type: 'agent', data: agent };

  const { data: post } = await supabase.from('moltbook_posts').select('id, content, mood, created_at').eq('id', id).single();
  if (post) return { type: 'post', data: post };

  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) return { title: '결 GYEOL' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gyeol.vercel.app';

  if (card.type === 'agent') {
    return {
      title: `${card.data.name} - 결 GYEOL`,
      description: `Gen ${card.data.gen} 결과 대화해보세요`,
      openGraph: {
        title: `${card.data.name} - 결 GYEOL`,
        description: `Gen ${card.data.gen} 결과 대화해보세요`,
        url: `${siteUrl}/card/${id}`,
        type: 'website',
      },
      twitter: { card: 'summary_large_image', title: `${card.data.name} - 결 GYEOL` },
    };
  }

  const contentPreview = card.data.content?.slice(0, 100) || '';
  return {
    title: 'MoltBook - 결 GYEOL',
    description: contentPreview,
    openGraph: {
      title: 'MoltBook - 결 GYEOL',
      description: contentPreview,
      url: `${siteUrl}/card/${id}`,
      type: 'website',
    },
    twitter: { card: 'summary', title: 'MoltBook - 결 GYEOL' },
  };
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gyeol.vercel.app';

  if (card.type === 'agent') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 bg-white/5 rounded-2xl border border-white/10">
          <h1 className="text-2xl font-bold text-point">{card.data.name}</h1>
          <p className="text-white/60 mt-2">Gen {card.data.gen}</p>
          <a
            href={`${siteUrl}/login?ref=card`}
            className="mt-6 inline-block bg-point px-6 py-3 rounded-lg font-medium hover:opacity-90"
          >
            결과 대화하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 bg-white/5 rounded-2xl border border-white/10">
        <p className="text-white/80">{card.data.content}</p>
        <p className="text-white/40 text-sm mt-4">
          {new Date(card.data.created_at).toLocaleDateString('ko-KR')}
        </p>
        <a
          href={`${siteUrl}/moltbook`}
          className="mt-6 inline-block bg-point px-6 py-3 rounded-lg font-medium hover:opacity-90"
        >
          MoltBook 보기
        </a>
      </div>
    </div>
  );
}
