/**
 * EvolutionEngine - GYEOL 진화 엔진
 * 대화를 분석하여 성격과 외형을 진화시킴
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function evolvePersonality(userId: string): Promise<void> {
  // 1. 최근 대화 10개 조회
  const { data: conversations } = await supabase
    .from('conversations')
    .select('content, emotion')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!conversations || conversations.length < 5) return;

  // 2. 감정 분석 → 성격 델타 계산
  let warmthDelta = 0;
  let logicDelta = 0;
  let creativityDelta = 0;
  let energyDelta = 0;
  let humorDelta = 0;

  for (const conv of conversations) {
    const emotion = conv.emotion?.detected;
    if (emotion === 'happy') { warmthDelta += 1; humorDelta += 1; }
    if (emotion === 'sad') { warmthDelta += 2; energyDelta -= 1; }
    if (emotion === 'excited') { creativityDelta += 1; energyDelta += 2; }
    if (emotion === 'anxious') { warmthDelta += 1; logicDelta -= 1; }
  }

  // 3. 현재 personality 조회
  const { data: agent } = await supabase
    .from('agents')
    .select('personality')
    .eq('user_id', userId)
    .single();

  if (!agent) return;

  const current = agent.personality;
  const delta = {
    warmth: Math.max(-5, Math.min(5, warmthDelta)),
    logic: Math.max(-5, Math.min(5, logicDelta)),
    creativity: Math.max(-5, Math.min(5, creativityDelta)),
    energy: Math.max(-5, Math.min(5, energyDelta)),
    humor: Math.max(-5, Math.min(5, humorDelta)),
  };

  // 4. 성격 업데이트
  const newPersonality = {
    warmth: Math.max(0, Math.min(100, (current.warmth || 50) + delta.warmth)),
    logic: Math.max(0, Math.min(100, (current.logic || 50) + delta.logic)),
    creativity: Math.max(0, Math.min(100, (current.creativity || 50) + delta.creativity)),
    energy: Math.max(0, Math.min(100, (current.energy || 50) + delta.energy)),
    humor: Math.max(0, Math.min(100, (current.humor || 50) + delta.humor)),
  };

  await supabase
    .from('agents')
    .update({ personality: newPersonality })
    .eq('user_id', userId);

  // 5. 진화 로그 기록
  await supabase.from('autonomous_logs').insert({
    agent_id: agent.id,
    source: 'edge_fn',
    action: 'personality_evolve',
    result: { delta, newPersonality },
  });
}

export async function checkEvolution(userId: string): Promise<{ shouldEvolve: boolean; newGen: number }> {
  const { data: agent } = await supabase
    .from('agents')
    .select('gen, total_conversations')
    .eq('user_id', userId)
    .single();

  if (!agent) return { shouldEvolve: false, newGen: 1 };

  const thresholds = [
    { gen: 2, conversations: 20 },
    { gen: 3, conversations: 50 },
    { gen: 4, conversations: 100 },
    { gen: 5, conversations: 200 },
    { gen: 6, conversations: 350 },
    { gen: 7, conversations: 500 },
    { gen: 8, conversations: 750 },
    { gen: 9, conversations: 1000 },
    { gen: 10, conversations: 1500 },
  ];

  for (const t of thresholds) {
    if (agent.total_conversations >= t.conversations && agent.gen < t.gen) {
      return { shouldEvolve: true, newGen: t.gen };
    }
  }

  return { shouldEvolve: false, newGen: agent.gen };
}
