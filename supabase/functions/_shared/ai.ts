/**
 * Edge Function 공통 유틸리티
 * callGroq, fallbackEmbedding, analyzeEmotion 등 공통 함수
 */

//=Groq API 호출=
export async function callGroq(
  messages: { role: string; content: string }[],
  model: string = 'llama-3.1-8b-instant',
  maxTokens: number = 1024
): Promise<string> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

//=임베딩 생성 (fallback)=
export function fallbackEmbedding(text: string): number[] {
  const vec = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[text.charCodeAt(i) % 384] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

//=감정 분석=
export function analyzeEmotion(text: string): string {
  const lower = text.toLowerCase();
  const emotions: Record<string, string[]> = {
    happy: ['기쁨', '행복', '좋아', '최고', '환상', 'love', 'happy', 'good'],
    sad: ['슬픔', '우울', '힘들', '괴로', 'sad', 'depressed', 'bad'],
    anxious: ['불안', '걱정', '두려', '무서', 'anxious', 'worried', 'fear'],
    angry: ['화나', '분노', '짜증', '열받', 'angry', 'mad', 'rage'],
    excited: ['신나', '설렘', '즐거', 'excited', 'exciting', 'fun'],
    lonely: ['외로', '쓸쓸', 'lonely', 'solitary'],
  };

  for (const [emotion, keywords] of Object.entries(emotions)) {
    if (keywords.some(k => lower.includes(k))) {
      return emotion;
    }
  }
  return 'neutral';
}

//=Cloudflare 임베딩 API (있을 경우)=
export async function getEmbedding(text: string): Promise<number[]> {
  const cfToken = Deno.env.get('CF_EMBEDDING_TOKEN');
  if (!cfToken) return fallbackEmbedding(text);

  try {
    const response = await fetch(
      'https://api.cloudflare.com/client/v4/accounts/workers-ai/embeddings@0',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );
    const data = await response.json();
    if (data.result?.embedding) return data.result.embedding;
  } catch (err) {
    console.error('[embedding] Cloudflare API failed, using fallback:', err);
  }
  return fallbackEmbedding(text);
}
