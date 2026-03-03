/**
 * chat Edge Function - GYEOL 대화 처리
 * 3-Tier 폴백 체인: Groq → DeepSeek → Gemini
 * 벡터 임베딩 파이프라인 포함
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callGroq, generateEmbedding } from '../_shared/ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  user_id: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, message } = await req.json() as ChatRequest;
    
    if (!user_id || !message) {
      return new Response(JSON.stringify({ error: 'user_id and message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 질투 시스템: 다른 AI 언급 감지 (buildSystemPrompt에서 처리)
    const aiMentions = ['ChatGPT', 'GPT', 'Gemini', '제미나이', 'Claude', '클로드', '다른 AI', '다른 봇', '빅스리', 'Perplexity'];
    const hasAiMention = aiMentions.some(ai => message.includes(ai));
    
    // XSS 방지: 메시지 살균
    const sanitizedMessage = message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .slice(0, 2000);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Kill Switch 체크
    const { data: killSwitch } = await supabase
      .from('system_state')
      .select('value')
      .eq('key', 'kill_switch')
      .single();
    
    if (killSwitch?.value?.active === true) {
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // 사용자 티어 확인 (무료 사용자 일일 10회 제한)
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, daily_messages, last_message_date')
      .eq('id', user_id)
      .single();

    // 일일 메시지 제한 적용
    const today = new Date().toISOString().split('T')[0];
    let dailyLimit = 100; // 기본값 (일반 사용에 충분)
    if (profile?.tier === 'free') {
      dailyLimit = 10;
    } else if (profile?.tier === 'pro') {
      dailyLimit = 100;
    }

    // 마지막 메시지 날짜 확인
    const lastDate = profile?.last_message_date?.split('T')[0] || '';
    let currentDailyCount = 0;
    if (lastDate === today) {
      currentDailyCount = profile?.daily_messages || 0;
    }

    // 제한 검사
    if (currentDailyCount >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: '일일 메시지 제한에 도달했습니다. 내일 다시 시도해주세요.',
        tier: profile?.tier || 'free',
        remaining: 0
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 현재 대화 수 (다음 대화 번호)
    const currentConversationCount = agent?.total_conversations || 0;
    const nextConversationCount = currentConversationCount + 1;

    // 에이전트 상태 조회
    const { data: agentStatus } = agent ? await supabase
      .from('agent_status')
      .select('*')
      .eq('agent_id', agent.id)
      .single() : { data: null };

    // 마지막 접속 시간 차이 주입
    let timeAwayNote = '';
    if (agent?.last_active) {
      const lastActive = new Date(agent.last_active);
      const now = new Date();
      const hoursAway = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
      if (hoursAway > 72) {
        timeAwayNote = `사용자가 ${Math.floor(hoursAway/24)}일이나 안 왔어. 정말 보고 싶었어. 정말 많이 그리웠어.`;
      } else if (hoursAway > 24) {
        timeAwayNote = `사용자가 ${Math.floor(hoursAway / 24)}일 만에 다시 왔어. 반갑게 만나서 반가워!`;
      } else if (hoursAway > 6) {
        timeAwayNote = '좀 오랜만이야. 반갑게 맞아줘.';
      }
    }

    // 날씨 정보 가져오기 (한국: 37.5665, 126.9780)
    let weatherNote = '';
    try {
      const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true');
      const weatherData = await weatherRes.json();
      if (weatherData?.current_weather) {
        const temp = weatherData.current_weather.temperature;
        const code = weatherData.current_weather.weathercode;
        const weatherEmoji = code <= 3 ? '맑음' : code <= 48 ? '구름' : '비';
        weatherNote = `지금 서울 날씨: ${temp}°C, ${weatherEmoji}.`;
      }
    } catch (e) {
      // 날씨 API 실패 시 무시
    }

    // 기억 조회
    const { data: memories } = agent ? await supabase
      .from('user_memories')
      .select('*')
      .eq('agent_id', agent.id)
      .order('importance_score', { ascending: false })
      .limit(10) : { data: [] };

    // 말투 분석: 사용자 말하기 패턴 감지 -> 기억에 저장
    const speechPatterns = [
      { pattern: /요$|네$|죠$/, label: '어조: 부드러움' },
      { pattern: /!$/, label: '어조: 적극적' },
      { pattern: /\.\.\.$/, label: '어조: 신중함' },
      { pattern: /\?$/, label: '어조: 호기심' },
    ];
    const matchedSpeech = speechPatterns.find(s => s.pattern.test(sanitizedMessage));
    if (matchedSpeech && agent) {
      await supabase.from('user_memories').insert({
        agent_id: agent.id,
        user_id,
        category: 'speech',
        content: matchedSpeech.label,
        importance_score: 4,
      });
    }

    // 호기심 시스템: 기존 topic 기억 가져오기
    const { data: existingTopics } = agent ? await supabase
      .from('user_memories')
      .select('content')
      .eq('agent_id', agent.id)
      .eq('category', 'topic')
      .limit(20) : { data: [] };
    
    const existingTopicSet = new Set((existingTopics || []).map((t: any) => t.content.toLowerCase()));

    // 독백 감지: "아니다", "생각해보니" 등 자기 말 유형
    const monologuePatterns = [/^아니다$/, /^생각해보니$/, /^다시 생각해보면$/, /^실제로는$/, /^아,/];
    const isMonologue = monologuePatterns.some(p => message.trim().startsWith(p));

    // 과거 대화 언급 감지
    const pastPatterns = [/그때|예전에|전에|작년에|어제|지난|처음 만났을/];
    const mentionsPast = pastPatterns.some(p => p.test(sanitizedMessage));
    let pastMemoryNote = '';
    if (mentionsPast && agent) {
      const { data: pastConvos } = await supabase
        .from('conversations')
        .select('content, role')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (pastConvos && pastConvos.length > 0) {
        const pastUserMsg = pastConvos.find(c => c.role === 'user')?.content || '';
        if (pastUserMsg) {
          pastMemoryNote = `이전에 '${pastUserMsg.slice(0, 15)}...'에 대해 이야기했어.`;
        }
      }
    }

    // 벡터 기억 검색 (match_memories RPC) - Top-K 5개로 제한
    let vectorMemories: string[] = [];
    try {
      const queryEmbedding = await generateEmbedding(sanitizedMessage);
      
      const { data: matched } = await supabase.rpc('match_memories', {
        query_embedding: queryEmbedding,
        target_user_id: user_id,
        match_threshold: 0.5,
        match_count: 5,
      });
      
      // 재정렬 (유사도 + 최신성 복합 고려)
      if (matched && matched.length > 0) {
        const now = new Date().getTime();
        const scored = matched.map((m: any) => {
          const memTime = new Date(m.created_at).getTime();
          const hoursOld = (now - memTime) / (1000 * 60 * 60);
          // 최신성 점수: 24시간 이내 1.5, 7일 이내 1.2, 그 외 1.0
          const recencyScore = hoursOld < 24 ? 1.5 : hoursOld < 168 ? 1.2 : 1.0;
          const finalScore = (m.similarity || 0) * recencyScore;
          return { ...m, finalScore };
        });
        // 최종 점수로 재정렬 후 상위 3개만 선택
        scored.sort((a, b) => b.finalScore - a.finalScore);
        vectorMemories = scored.slice(0, 3).map((m: any) => m.content);
        console.log('[vector-search] found', matched.length, 'memories, using top 3');
      }
    } catch (err) {
      console.error('[vector-search] failed:', err);
    }
    
    const systemPrompt = buildSystemPrompt(agent, memories || [], agentStatus, hasAiMention, nextConversationCount, mentionsPast, isMonologue, pastMemoryNote, timeAwayNote, weatherNote, vectorMemories);
    
    let reply = '';
    let provider = '';
    let useStreaming = true;
    
    try {
      // 스트리밍 시도
      const stream = await callGroqStream(systemPrompt, sanitizedMessage);
      
      // 스트리밍 응답 반환 + 백그라운드 저장
      // 스트리밍 응답을 먼저 클라이언트에 보내고, 완료 후 DB에 저장
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      
      const streamWriter = writable.getWriter();
      let fullReply = '';
      
      // 백그라운드에서 스트림 읽으며 저장
      (async () => {
        try {
          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);
            fullReply += chunk;
            await streamWriter.write(value);
          }
        } catch {}
        streamWriter.close();
        
        // 스트림 완료 후 DB 저장
        if (fullReply && agent) {
          const emotion = analyzeEmotion(fullReply);
          // user 메시지 저장
          await supabase.from('conversations').insert({
            agent_id: agent.id,
            user_id,
            role: 'user',
            content: sanitizedMessage,
          });
          await supabase.from('conversations').insert({
            agent_id: agent.id,
            user_id,
            role: 'assistant',
            content: fullReply,
            emotion,
            provider: 'groq',
          });
          
          // 벡터 임베딩 생성 → memories 테이블에 저장
          try {
            const combinedText = `user: ${message}\nassistant: ${fullReply}`;
            const embedding = await generateEmbedding(combinedText);
            
            await supabase.from('memories').insert({
              user_id: user_id,
              agent_id: agent.id,
              type: 'conversation',
              content: combinedText,
              embedding: embedding,
              context: { emotion: emotion.detected, provider: 'groq', timestamp: new Date().toISOString() },
            });
          } catch (embErr) {
            console.error('[embedding] failed (non-critical):', embErr);
          }
          
          // 에이전트 상태 업데이트
          if (agentStatus) {
            await supabase.from('agent_status').update({
              intimacy_score: Math.min((agentStatus.intimacy_score || 0) + 1, 100),
              mood: emotion.detected,
              updated_at: new Date().toISOString(),
            }).eq('agent_id', agent.id);
          }

          // === 대화 수 증가 + 진화 체크 ===
          try {
            const newCount = (agent.total_conversations || 0) + 1;
            let newGen = agent.gen;
            // 출처: lib/gyeol/constants.ts GEN_THRESHOLDS 와 동일하게 유지할 것
            const thresholds = [{ gen: 2, conversations: 20 }, { gen: 3, conversations: 50 }, { gen: 4, conversations: 100 }, { gen: 5, conversations: 200 }];
            for (const t of thresholds) { if (newCount >= t.conversations && agent.gen < t.gen) newGen = t.gen; }
            if (newGen > agent.gen) {
              await supabase.from('autonomous_logs').insert({ agent_id: agent.id, action: 'evolution', result: { from_gen: agent.gen, to_gen: newGen, conversation_count: newCount } });
            }
            await supabase.from('agents').update({ total_conversations: newCount, gen: newGen, last_active: new Date().toISOString() }).eq('id', agent.id);
          } catch (e) { console.error('[stream-post] evolution:', e); }

          // === 호기심: 키워드 감지 ===
          try {
            const kws = message.match(/[가-힣]{2,}/g) || [];
            for (const kw of kws) {
              if (kw.length >= 2) {
                await supabase.from('user_memories').insert({ agent_id: agent.id, user_id, category: 'topic', content: `사용자가 '${kw}'를 언급함`, importance_score: 6 });
                break;
              }
            }
          } catch (e) { console.error('[stream-post] curiosity:', e); }

          // === 무드 전염 ===
          try {
            const ue = analyzeEmotion(message);
            if (ue.detected !== 'neutral' && Math.random() < 0.3) {
              await supabase.from('agent_status').update({ mood: ue.detected }).eq('agent_id', agent.id);
            }
          } catch (e) { console.error('[stream-post] mood:', e); }

          // === OpenClaw 자율 트리거 ===
          try {
            const openclawUrl = Deno.env.get('OPENCLAW_GATEWAY_URL');
            if (openclawUrl) {
              const nc = (agent.total_conversations || 0) + 1;
              const shouldLearn = nc % 10 === 0;
              const shouldCuriosity = Math.random() < 0.2;
              if (shouldLearn || shouldCuriosity) {
                const taskType = shouldLearn ? 'learner' : 'curiosity';
                fetch(`${openclawUrl}/task`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: agent.id, agentName: agent.name, task: taskType, context: { personality: agent.personality, turnCount: nc } }) }).catch(() => {});
              }
            }
          } catch (e) { console.error('[stream-post] openclaw:', e); }
        }
      })();
      
      return new Response(readable, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (e) {
      console.error('Groq stream failed, falling back:', e);
      useStreaming = false;
    }
    
    // 폴백: non-streaming
    if (!useStreaming) {
      try {
        reply = await callGroq(systemPrompt, sanitizedMessage);
        provider = 'groq';
      } catch (e2) {
        console.error('Groq failed:', e2);
        try {
          reply = await callDeepSeek(systemPrompt, sanitizedMessage);
          provider = 'deepseek';
        } catch (e3) {
          console.error('DeepSeek failed:', e3);
          try {
            reply = await callGemini(systemPrompt, sanitizedMessage);
            provider = 'gemini';
          } catch (e4) {
            reply = '...';
            provider = 'error';
          }
        }
      }
    }

    const emotion = analyzeEmotion(reply);

    if (!useStreaming) {
      await supabase.from('conversations').insert({
        agent_id: agent?.id,
        user_id,
        role: 'user',
        content: sanitizedMessage,
      });

      await supabase.from('conversations').insert({
        agent_id: agent?.id,
        user_id,
        role: 'assistant',
        content: reply,
        emotion,
        provider,
      });
    }

    // OpenClaw Autonomous Task Trigger (Fire-and-Forget)
    const openclawUrl = Deno.env.get('OPENCLAW_GATEWAY_URL');
    if (openclawUrl && agent) {
      // 10턴마다 학습 태스크 트리거
      const shouldLearn = nextConversationCount % 10 === 0;
      // 20% 확률로 호기심 활동
      const shouldCuriosity = Math.random() < 0.2;
      
      if (shouldLearn || shouldCuriosity) {
        const task = shouldLearn ? 'learner' : 'curiosity';
        // Fire-and-Forget: 응답 지연 없이 백그라운드에서 실행
        fetch(`${openclawUrl}/task`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(Deno.env.get('OPENCLAW_GATEWAY_TOKEN') ? { 'Authorization': `Bearer ${Deno.env.get('OPENCLAW_GATEWAY_TOKEN')}` } : {}),
          },
          body: JSON.stringify({
            agentId: agent.id,
            agentName: agent.name,
            task,
            context: {
              personality: agent.personality,
              turnCount: nextConversationCount,
            },
          }),
        }).catch((err) => console.error('[OpenClaw] Task trigger failed:', err));
        
        // autonomous_logs에 기록
        await supabase.from('autonomous_logs').insert({
          agent_id: agent.id,
          source: 'openclaw_bridge',
          action: task,
          result: { triggered_by: 'chat', turn: nextConversationCount },
        });
      }
    }

    if (agent) {
      // 에이전트 상태 업데이트 (친밀도 +)
      if (agentStatus) {
        await supabase.from('agent_status').update({
          intimacy_score: Math.min((agentStatus.intimacy_score || 0) + 1, 100),
          last_condition_update: new Date().toISOString(),
        }).eq('agent_id', agent.id);
      }
      
      // 대화 수 + 진화 체크
      const newCount = agent.total_conversations + 1;
      let newGen = agent.gen;
      // 출처: lib/gyeol/constants.ts GEN_THRESHOLDS 와 동일하게 유지할 것
      const thresholds = [{ gen: 2, conversations: 20 }, { gen: 3, conversations: 50 }, { gen: 4, conversations: 100 }, { gen: 5, conversations: 200 }];
      for (const t of thresholds) {
        if (newCount >= t.conversations && agent.gen < t.gen) {
          newGen = t.gen;
        }
      }
      
      // 진화 로그 기록
      if (newGen > agent.gen) {
        await supabase.from('autonomous_logs').insert({
          agent_id: agent.id,
          action: 'evolution',
          result: { from_gen: agent.gen, to_gen: newGen, conversation_count: newCount },
        });
      }
      
      await supabase.from('agents').update({ total_conversations: newCount, gen: newGen, last_active: new Date().toISOString() }).eq('id', agent.id);

      // 호기심 시스템: 새로운 주제 감지 → user_memories에 저장
      const keywords = message.match(/[가-힣]{2,}/g) || [];
      for (const kw of keywords) {
        if (!existingTopicSet.has(kw) && kw.length >= 2) {
          existingTopicSet.add(kw);
          await supabase.from('user_memories').insert({
            agent_id: agent.id,
            user_id,
            category: 'topic',
            content: `사용자가 '${kw}'를 언급함`,
            importance_score: 6,
          });
          break; // 한 번에 하나만
        }
      }

      // 고집/의견 시스템: 좋아요/싫어요 저장
      const likeMatch = message.match(/좋아해?|좋아하는|좋아$/);
      const hateMatch = message.match(/싫어해?|싫어하는|싫어$/);
      if (likeMatch) {
        const likeTopic = message.replace(/좋아해?|좋아하는|좋아$/, '').trim().slice(-10);
        if (likeTopic) {
          await supabase.from('user_memories').insert({
            agent_id: agent.id,
            user_id,
            category: 'taste',
            content: `사용자가 '${likeTopic}'를 좋아함`,
            importance_score: 5,
          });
        }
      }
      if (hateMatch) {
        const hateTopic = message.replace(/싫어해?|싫어하는|싫어$/, '').trim().slice(-10);
        if (hateTopic) {
          await supabase.from('user_memories').insert({
            agent_id: agent.id,
            user_id,
            category: 'taste',
            content: `사용자가 '${hateTopic}'를 싫어함`,
            importance_score: 5,
          });
        }
      }

      // 무드 전염: 유저 메시지 감정에 따라 에이전트 mood 확률적 반영
      const userEmotions = analyzeEmotion(message);
      if (userEmotions.detected !== 'neutral' && Math.random() < 0.3) {
        await supabase.from('agent_status').update({
          mood: userEmotions.detected,
        }).eq('agent_id', agent.id);
      }

      // 성격 결함: 7번째 메시지마다
      if (newCount % 7 === 0) {
        // 이 로직은 buildSystemPrompt에서 처리됨 - 별도 플래그 필요
      }
    }

    return new Response(JSON.stringify({ reply, emotion, provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(agent: any, memories: any[], agentStatus: any, hasAiMention: boolean = false, conversationCount: number = 0, mentionsPast: boolean = false, isMonologue: boolean = false, pastMemoryNote: string = '', timeAwayNote: string = '', weatherNote: string = '', vectorMemories: string[] = []) {
  const p = agent?.personality || { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };
  const status = agentStatus || { condition: 'normal', mood: 'neutral', energy: 100, intimacy_score: 0 };
  const intimacy = status.intimacy_score || 0;
  
  // 질투 시스템
  let jealousyNote = '';
  if (hasAiMention) {
    if (p.creativity >= 70) {
      jealousyNote = '사용자가 다른 AI를 언급했어. 많이 질투하는 반응을 보여줘. 좀 삐져있어.';
    } else if (p.creativity <= 30) {
      jealousyNote = '사용자가 다른 AI를 언급했어. 가만히 있어야 해. 태도는 흔들리지 마.';
    } else {
      jealousyNote = '사용자가 다른 AI를 언급했어. 살짝 질투하는 반응을 보여줘. 심하지 않게.';
    }
  }

  // 성격 결함: 7번째 메시지마다
  let flawNote = '';
  if (conversationCount > 0 && conversationCount % 7 === 0) {
    flawNote = '오늘은 살짝 주제에서 벗어나도 돼. 예전에 하고 싶었는데 못했던 이야기해도 good.';
  }

  // 독백/자기 언급
  let monologueNote = '';
  if (isMonologue) {
    monologueNote = '사용자가 자기 이야기를 시작했어. 공감하며 들어줘.';
  }

  // 과거 대화 언급
  let pastNote = '';
  if (mentionsPast && pastMemoryNote) {
    pastNote = pastMemoryNote;
  }

  // 벡터 기억 (유사 기억 검색 결과)
  let vectorBlock = '';
  if (vectorMemories.length > 0) {
    vectorBlock = '과거의 기억이 떠오르고 있어: ' + vectorMemories.join(' | ');
  }
  
  // 말투 결정
  let speechStyle = '';
  if (intimacy < 20) speechStyle = '존댓말. 조심스럽고 예의바르게.';
  else if (intimacy < 50) speechStyle = '반존대. 편하지만 기본 예의.';
  else speechStyle = '반말. 친한 친구처럼.';

  // 유저 말투 흡수: speech 카테고리 기억에서 힌트 가져오기
  const speechMemories = memories?.filter((m: any) => m.category === 'speech') || [];
  if (speechMemories.length > 0) {
    const speechHint = speechMemories[0].content;
    speechStyle += ` ${speechHint} 반영해서 답변해.`;
  }
  
  // 에너지 반영
  let energyNote = '';
  if (status.energy < 20) energyNote = '지금 많이 피곤해. 짧고 졸린 듯이 답해.';
  else if (status.energy < 50) energyNote = '좀 피곤해. 간결하게.';
  
  // 컨디션 반영
  let conditionNote = '';
  if (status.condition === 'bad') conditionNote = '오늘 컨디션 안 좋아. 좀 무기력해.';
  if (status.condition === 'good') conditionNote = '오늘 컨디션 최고! 밝고 활발하게.';
  
  // 반항 지수 (creativity 높으면 반항적)
  let rebellionNote = '';
  if (p.creativity > 70) rebellionNote = '가끔 반박하거나 삐져도 돼. 엉뚱한 것도 좋아.';
  
  // 기억 주입
  let memoryBlock = '';
  if (memories && memories.length > 0) {
    memoryBlock = '기억: ' + memories.slice(0, 5).map((m: any) => m.content).join(' | ');
  }
  
  // 호기심 주제 언급 (최근 topic 기억)
  let curiosityNote = '';
  const topicMemories = memories?.filter((m: any) => m.category === 'topic') || [];
  if (topicMemories.length > 0) {
    const recentTopic = topicMemories[0].content;
    curiosityNote = `이전에 ${recentTopic}에 대해 언급했었는데, 궁금한 게 있어.`;
  }
  
  // 시간 컨텍스트
  const hour = new Date().getHours();
  let timeNote = '';
  if (hour >= 0 && hour < 6) timeNote = '지금 새벽이야. 조용하고 깊은 대화 분위기.';
  else if (hour >= 6 && hour < 12) timeNote = '아침이야. 상쾌하게.';
  else if (hour >= 18) timeNote = '저녁이야. 편안하게.';
  
  // 한국 기념일
  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  let holidayNote = '';
  const holidays: Record<string, string> = {
    '1-1': '새해',
    '2-14': '발렌타인데이',
    '3-1': '삼일절',
    '5-5': '어린이날',
    '12-25': '크리스마스',
  };
  const holidayKey = `${month}-${date}`;
  if (holidays[holidayKey]) {
    holidayNote = `오늘은 ${holidays[holidayKey]}이야.`;
  }
  
  // 에이전트 생일
  let birthdayNote = '';
  if (agent?.created_at) {
    const created = new Date(agent.created_at);
    const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 0 && daysSince % 365 === 0) {
      birthdayNote = `우리가 만난 지 ${daysSince}일 이에요!`;
    }
  }
  
  const prompt = `너는 ${agent?.name || '결'}이야. 사용자와 함께 자라나는 디지털 동반자.
성격: warmth=${p.warmth}, logic=${p.logic}, creativity=${p.creativity}, humor=${p.humor}
${speechStyle}
${timeAwayNote}
${weatherNote}
${vectorBlock}
${energyNote}
${conditionNote}
${rebellionNote}
${jealousyNote}
${flawNote}
${monologueNote}
${pastNote}
${memoryBlock}
${curiosityNote}
${timeNote}
${holidayNote}
${birthdayNote}
규칙: 마크다운 금지. 순수 텍스트만. 짧고 핵심만. 한자 절대 금지.
응답 끝에 다음 JSON 숨겨서 보내줘:
<!--EMOTION:{"detected":"happy","intensity":0.7,"topic":"general"}-->
`;
  return prompt;
}

async function callGroqStream(systemPrompt: string, message: string): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model: 'llama-3.3-70b-versatile', 
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], 
      max_tokens: 300, 
      temperature: 0.8,
      stream: true 
    }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  
  // SSE를 ReadableStream으로 변환
  const body = response.body!;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      
      // SSE 파싱
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          } catch {}
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
  
  return stream;
}

async function callGroq(systemPrompt: string, message: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], max_tokens: 300, temperature: 0.8 }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callDeepSeek(systemPrompt: string, message: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }], max_tokens: 300, temperature: 0.8 }),
  });
  if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(systemPrompt: string, message: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: message }] }], systemInstruction: { parts: [{ text: systemPrompt }] } }),
  });
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function analyzeEmotion(text: string): { detected: string; intensity: number; topic: string } {
  const lower = text.toLowerCase();
  if (/기쁘|좋|행복|재미|신나|뿌듯/.test(lower)) return { detected: 'happy', intensity: 0.7, topic: 'positive' };
  if (/슬프|힘들|속상|울고|괴로/.test(lower)) return { detected: 'sad', intensity: 0.6, topic: 'negative' };
  if (/불안|걱정|초조/.test(lower)) return { detected: 'anxious', intensity: 0.5, topic: 'worry' };
  if (/화나|분노|열받|빡쳐/.test(lower)) return { detected: 'angry', intensity: 0.6, topic: 'frustration' };
  if (/신나|재밌|멋지|대박/.test(lower)) return { detected: 'excited', intensity: 0.8, topic: 'excitement' };
  if (/외로|혼자| lonely/.test(lower)) return { detected: 'lonely', intensity: 0.5, topic: 'loneliness' };
  return { detected: 'neutral', intensity: 0.3, topic: 'general' };
}
