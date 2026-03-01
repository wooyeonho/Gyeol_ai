# GYEOL 전체 코드 분석 리포트 + 환경변수 가이드 + OpenHands 보완 지시서

---

# Part 1: 환경변수 완전 가이드

## 어디서 키를 발급받고, 어디에 넣는지

### A. Supabase (3개 — 모든 곳에서 사용)

| 키 | 발급처 | 넣을 곳 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | Vercel + .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 곳 → anon public | Vercel + .env.local |
| `SUPABASE_SERVICE_ROLE_KEY` | 같은 곳 → service_role (절대 프론트에 노출 금지) | Vercel + Supabase Edge Functions + Koyeb |

발급 방법:
1. https://supabase.com → 프로젝트 선택
2. 좌측 Settings → API
3. URL, anon key, service_role key 복사

### B. AI 프로바이더 (3개)

| 키 | 발급처 | 넣을 곳 |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys → Create API Key | Supabase Edge Functions (필수) + Koyeb |
| `DEEPSEEK_API_KEY` | https://platform.deepseek.com → API Keys | Supabase Edge Functions (폴백) |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey → Create API Key | Supabase Edge Functions (폴백) |

### C. Cloudflare Workers AI (2개 — 벡터 임베딩)

| 키 | 발급처 | 넣을 곳 |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | https://dash.cloudflare.com → 우측 상단 Account ID | Supabase Edge Functions |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → Profile → API Tokens → Create Token → Workers AI 읽기 권한 | Supabase Edge Functions |

발급 방법:
1. Cloudflare 계정 생성 (무료)
2. Dashboard 우측에서 Account ID 복사
3. Profile → API Tokens → Create Token
4. Template: "Workers AI" 선택 (또는 Custom에서 Account > Workers AI > Read)
5. Token 복사

### D. OpenClaw / Koyeb (2개 — 자율 에이전트)

| 키 | 발급처 | 넣을 곳 |
|---|---|---|
| `OPENCLAW_GATEWAY_URL` | Koyeb 배포 후 앱 URL (예: https://gyeol-openclaw-xxxxx.koyeb.app) | Vercel + Supabase Edge Functions |
| `OPENCLAW_GATEWAY_TOKEN` | 직접 생성: `openssl rand -hex 32` | Vercel + Supabase Edge Functions + Koyeb |

### E. 기타 (3개)

| 키 | 발급처 | 넣을 곳 |
|---|---|---|
| `ENCRYPTION_SECRET` | 직접 생성: `openssl rand -base64 32` | Vercel |
| `KILL_SWITCH_TOKEN` | 직접 생성: `openssl rand -hex 16` | Vercel + Supabase Edge Functions |
| `NEXT_PUBLIC_SITE_URL` | 본인 도메인 (예: https://gyeol.vercel.app) | Vercel |

---

## 실제 설정 방법

### Vercel 환경변수 설정
1. https://vercel.com → 프로젝트 → Settings → Environment Variables
2. 아래 키 입력 (Production, Preview, Development 모두 체크):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_SECRET=(openssl rand -base64 32 결과)
KILL_SWITCH_TOKEN=(openssl rand -hex 16 결과)
OPENCLAW_GATEWAY_URL=https://gyeol-openclaw-xxxxx.koyeb.app
OPENCLAW_GATEWAY_TOKEN=(openssl rand -hex 32 결과)
NEXT_PUBLIC_SITE_URL=https://gyeol.vercel.app
```

### Supabase Edge Functions 환경변수 설정
1. Supabase Dashboard → 좌측 Edge Functions
2. 상단 "Secrets" → Manage secrets
3. 아래 키 추가:

```
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=AIza...
CLOUDFLARE_ACCOUNT_ID=xxxx
CLOUDFLARE_API_TOKEN=xxxx
OPENCLAW_GATEWAY_URL=https://gyeol-openclaw-xxxxx.koyeb.app
OPENCLAW_GATEWAY_TOKEN=(Vercel과 동일한 값)
KILL_SWITCH_TOKEN=(Vercel과 동일한 값)
```

주의: SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY는 Edge Functions에서 자동 주입됨 (별도 설정 불필요)

### Koyeb 환경변수 설정
1. https://app.koyeb.com → App → Settings → Environment Variables
2. 아래 키 추가:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...(service_role key)
GROQ_API_KEY=gsk_...
OPENCLAW_GATEWAY_TOKEN=(Vercel과 동일한 값)
```

### Supabase 대시보드 필수 설정
1. Authentication → Settings → Anonymous sign-ins 활성화
2. Database → Replication → Realtime 활성화 (agents, agent_status 테이블)

---

# Part 2: 전체 코드 분석 (45파일, 5,204줄)

## 아키텍처 요약

```
사용자 ←→ Next.js (Vercel)
              ↕
         Supabase (DB + Auth + Realtime + Edge Functions)
              ↕                    ↕
    Groq/DeepSeek/Gemini    Koyeb (OpenClaw)
```

chat Edge Function이 744줄로 전체의 14%를 차지하며 GYEOL의 핵심 두뇌 역할.

## 파일별 분석 결과

### 인프라 (양호)
- middleware.ts: Next.js 15 + Supabase SSR 정석 패턴. 리다이렉트 로직은 주석 처리됨 (의도적)
- lib/supabase/client.ts: 싱글톤 OK
- lib/supabase/server.ts: Server Component용 OK
- lib/env.ts: Zod 검증 OK. 단, env를 모듈 최상위에서 실행하므로 빌드 시 환경변수 없으면 크래시 가능
- lib/errors.ts: 에러 코드 정의 OK, 실제 사용처 부족

### 프론트엔드 (양호, 일부 보완 필요)
- app/page.tsx (235줄): 메인 허브. 인증→에이전트 로드→Realtime 구독→EvolutionCeremony 모두 연결됨
- components/ChatInterface.tsx (275줄): SSE 수신, 침묵 타이머, 메시지 UI
- components/BirthSequence.tsx (368줄): 8단계 온보딩. 성격 선택지 있음 (emotionToPersonality)
- components/VoidCanvas.tsx (196줄): Three.js 파티클 + mood 색상 + gen 크기 (확인 필요)

### Edge Functions (핵심부, 문제 다수)
- chat/index.ts (744줄): 벡터 검색, SSE, 질투/호기심/고집/무드전염/성격결함 전부 포함. 그러나 심각한 버그 있음
- deep-brain/index.ts (198줄): AI 생성 꿈/독백 OK
- evolve/index.ts (200줄): AI 기반 열린 진화 OK
- reflection/index.ts (218줄): 하루 성찰 + 기억 압축 OK
- openclaw-bridge/index.ts (169줄): learner + curiosity OK

---

# Part 3: 발견된 문제 + OpenHands 보완 지시서

## === 역할 ===

GYEOL 시니어 풀스택 개발자. 기존 코드 구조 유지. 최소 변경 원칙.

## === 작업 기억 ===

- 레포: https://github.com/wooyeonho/Gyeol_ai.git
- 현재 커밋: 15c2f41
- 총 45파일, 5,204줄
- 완료된 것: 인증, DB, 프롬프트, SSE, 벡터검색, AI생성 꿈/독백, 열린진화, reflection, openclaw-bridge, 3-tier 브릿지
- 주의: 한자/일본어 절대 금지, 기존 코드 구조 유지

---

## TASK 1: 한자/일본어 9건 전수 제거 (치명적)

파일: 여러 파일
의도: 한국어 서비스에 중국어/일본어 문자가 섞여있으면 유저에게 노출될 수 있고, AI 프롬프트에 들어가면 응답 품질 저하

수정 목록:
```
lib/gyeol/openclaw-client.ts:66
  "メインスレッドに影響しない" → "메인 스레드에 영향 없음"

supabase/functions/chat/index.ts:155
  "사용자说话 패턴" → "사용자 말하기 패턴"

supabase/functions/chat/index.ts:157
  /呀|啊|呢$/ → 이 정규식 자체가 중국어임. 한국어 패턴으로 교체:
  /요$|네$|죠$/  (label: '어조: 부드러움')

supabase/functions/chat/index.ts:183
  "자기 말类型" → "자기 말 타입"

supabase/functions/chat/index.ts:248
  "+后台 저장" → "+ 백그라운드 저장"

supabase/functions/chat/index.ts:256
  "//后台에서" → "// 백그라운드에서"

supabase/functions/chat/index.ts:374
  "응답 지연 없이后台에서" → "응답 지연 없이 백그라운드에서"

supabase/functions/chat/index.ts:487
  "별도フラグ 필요" → "별도 플래그 필요"

supabase/functions/chat/index.ts:512
  "질투하는 反应을" → "질투하는 반응을"

supabase/functions/chat/index.ts:516
  "질투하는 反应을" → "질투하는 반응을"
```

### 완료 검증
```bash
grep -rn '主\|考\|沉\|漢\|反应\|后台\|メイン\|フラグ\|说话\|类型\|呀\|啊\|呢' --include="*.ts" --include="*.tsx" .
# 결과: 0건
```

---

## TASK 2: 대화 중복 저장 버그 수정 (치명적)

파일: supabase/functions/chat/index.ts
위치: 273행 (스트리밍 후 저장) + 348-355행 (폴백 후 저장)
의도: SSE 스트리밍 성공 시 273행에서 assistant 메시지를 저장하는데, 348행에서 user 메시지를, 355행에서 또 assistant를 저장함. 스트리밍 성공이면 348-355행도 실행되어 **assistant 메시지가 2번 저장**되고, **user 메시지는 스트리밍 경로에서 저장 안 됨**

수정:
1. 스트리밍 성공 시 return하기 전에 user 메시지도 저장 추가
2. 348-355행의 conversations INSERT를 `if (!useStreaming)` 블록 안으로 이동
   (현재 348-355행은 스트리밍 여부와 무관하게 항상 실행됨)

구체적으로:
- 스트리밍 성공 async 블록(256행 부근) 안에 user INSERT 추가:
```typescript
await supabase.from('conversations').insert({
  agent_id: agent.id,
  user_id,
  role: 'user',
  content: message,
});
```

- 348-360행(기존 user+assistant INSERT)을 `if (!useStreaming)` 조건문 안으로 감싸기

### 완료 검증
```bash
grep -c "from('conversations').insert" supabase/functions/chat/index.ts
# 결과: 정확히 4건 (스트리밍: user+assistant, 폴백: user+assistant)
```

---

## TASK 3: 스트리밍 경로에서 OpenClaw 트리거 + 호기심/고집/무드전염 누락

파일: supabase/functions/chat/index.ts
위치: 스트리밍 return 이후 코드(364-490행)
의도: SSE 스트리밍 성공 시 return new Response(readable, ...) 후에 있는 코드(OpenClaw 트리거, 호기심, 고집, 무드전염, 에이전트 업데이트)가 실행되지 않음. 스트리밍 return 이전 또는 async 블록 내에서 실행되어야 함.

수정:
스트리밍 async 블록(256행의 IIFE) 안에, streamWriter.close() 이후 fullReply 저장 다음에, 아래 로직을 추가:
- 에이전트 total_conversations 업데이트
- 진화 체크 (gen 변경)
- 호기심 (새 주제 감지 → topic 저장)
- 고집 (좋아/싫어 감지 → taste 저장)
- 무드 전염 (유저 감정 → agent_status.mood)
- OpenClaw fire-and-forget 트리거

현재 이 로직들은 364-490행에 있지만 스트리밍 return 이후라 실행 안 됨.

### 완료 검증
```bash
# 스트리밍 async 블록 안에 아래 키워드가 있어야 함
sed -n '250,320p' supabase/functions/chat/index.ts | grep -c 'topic\|taste\|mood\|openclaw\|total_conversations'
# 결과: 5 이상
```

---

## TASK 4: env.ts 빌드 시 크래시 방지

파일: lib/env.ts
위치: 마지막 줄 `export const env = parseEnv();`
의도: 모듈 최상위에서 parseEnv()를 실행하므로, 환경변수가 없는 빌드 환경(CI/CD)에서 즉시 크래시. Vercel 빌드 실패 원인이 될 수 있음.

수정:
```typescript
// 변경 전
export const env = parseEnv();

// 변경 후
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = parseEnv();
  }
  return _env;
}
```

그리고 env를 import하는 모든 파일에서 `env.XXX` → `getEnv().XXX` 로 변경.
(현재 실제로 env를 import하는 파일이 있는지 확인 필요 — 없으면 이 변경만으로 충분)

### 완료 검증
```bash
grep -rn "from.*env" --include="*.ts" --include="*.tsx" app/ components/ lib/ | grep -v node_modules
# import { env }가 아닌 import { getEnv }로 변경되었는지 확인
```

---

## TASK 5: 002_memory_schema.sql — system_state 중복 생성

파일: supabase/migrations/002_memory_schema.sql
위치: 파일 끝부분
의도: 001_schema.sql에서 이미 system_state 테이블을 CREATE + INSERT 하는데, 002에서 또 CREATE TABLE IF NOT EXISTS system_state를 하고 있음. 동일 구조면 문제없지만, 컬럼 정의가 다를 경우 마이그레이션 실패.

수정:
002_memory_schema.sql에서 system_state 관련 CREATE TABLE 블록 삭제 (001에서 이미 생성됨)

### 완료 검증
```bash
grep -c 'system_state' supabase/migrations/002_memory_schema.sql
# 결과: 0 (RPC 함수 내부 참조 제외)
```

---

## TASK 6: autonomous_logs INSERT 필드명 불일치

파일: supabase/functions/chat/index.ts
위치: 420행 부근 (진화 로그)
의도: 001_schema.sql의 autonomous_logs 테이블은 `source, action, result` 필드인데, chat 420행에서는 `event_type, content, metadata` 필드로 INSERT 하고 있어 실패함.

수정:
```typescript
// 변경 전 (420행 부근)
await supabase.from('autonomous_logs').insert({
  agent_id: agent.id,
  event_type: 'evolution',
  content: `진화: Gen ${agent.gen} → Gen ${newGen}`,
  metadata: { from_gen: agent.gen, to_gen: newGen, conversation_count: newCount },
});

// 변경 후
await supabase.from('autonomous_logs').insert({
  agent_id: agent.id,
  source: 'edge_fn',
  action: 'evolution',
  result: { from_gen: agent.gen, to_gen: newGen, conversation_count: newCount },
});
```

### 완료 검증
```bash
grep -n 'event_type\|content.*진화\|metadata.*from_gen' supabase/functions/chat/index.ts
# 결과: 0건
grep -n "action: 'evolution'" supabase/functions/chat/index.ts
# 결과: 1건
```

---

## TASK 7: 티어별 대화 제한 추가

파일: supabase/functions/chat/index.ts
위치: Kill Switch 체크 직후 (47행 이후)
의도: constants.ts에 TIER_LIMITS가 정의되어 있지만 chat에서 체크 안 함. free 유저가 무제한 대화 가능.

수정:
```typescript
// Kill Switch 체크 바로 아래에 추가:

// 티어별 대화 제한 체크
if (agent) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user_id)
    .single();
  
  const tier = profile?.tier || 'free';
  const limits: Record<string, number> = { free: 20, pro: 100, premium: -1 };
  const dailyLimit = limits[tier] ?? 20;
  
  if (dailyLimit > 0) {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('role', 'user')
      .gte('created_at', today + 'T00:00:00Z');
    
    if ((count || 0) >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: '오늘은 대화 횟수를 다 썼어요. 내일 다시 만나요!',
        code: 'TIER_LIMIT_EXCEEDED'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
}
```

### 완료 검증
```bash
grep -c 'TIER_LIMIT\|dailyLimit\|tier.*free\|대화 횟수' supabase/functions/chat/index.ts
# 결과: 3 이상
```

---

## TASK 8: 리다이렉트 로직 활성화

파일: middleware.ts
위치: 47-50행 (주석 처리된 리다이렉트)
의도: 현재 리다이렉트가 주석 처리되어 있어서 비로그인 유저도 메인 페이지 접근 가능. page.tsx에서 익명 로그인을 자동으로 하므로 큰 문제는 아니지만, /settings 등 보호 라우트는 리다이렉트 필요.

수정:
```typescript
// 주석 해제 + 수정
const publicRoutes = ['/login', '/landing', '/api'];
const isPublicRoute = publicRoutes.some(r => request.nextUrl.pathname.startsWith(r));

if (!user && !isPublicRoute) {
  // 메인 페이지(/)는 허용 (익명 로그인 자동 처리)
  if (request.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

if (user && request.nextUrl.pathname === '/login') {
  return NextResponse.redirect(new URL('/', request.url));
}
```

### 완료 검증
```bash
grep -c 'redirect.*login\|publicRoutes' middleware.ts
# 결과: 2 이상
```

---

## TASK 9: Coins 잔액 음수 방지

파일: app/api/coins/route.ts
위치: POST 핸들러
의도: 현재 코인 차감 시 잔액 체크 없음. amount가 음수면 잔액이 마이너스 될 수 있음.

수정:
POST에서 amount < 0 (차감)일 때:
```typescript
if (amount < 0 && currentCoins + amount < 0) {
  return NextResponse.json({ 
    error: '코인이 부족합니다', 
    code: 'INSUFFICIENT_COINS' 
  }, { status: 400 });
}
```

### 완료 검증
```bash
grep -c 'INSUFFICIENT\|코인이 부족' app/api/coins/route.ts
# 결과: 1 이상
```

---

## === 금지사항 (전 TASK 공통) ===

- 지시하지 않은 파일 수정 금지
- 불필요한 리팩토링 금지
- 한자/일본어 문자 사용 절대 금지
- 각 TASK 완료 후 반드시 검증 명령어 실행하고 결과 보여줄 것
- npm run build 성공 확인 후 다음 TASK 진행
- 한 번에 하나의 TASK만 진행

---

## === 우선순위 ===

1. TASK 1 (한자 제거) — AI 프롬프트 오염 방지
2. TASK 2 (중복 저장) — 데이터 무결성
3. TASK 3 (스트리밍 후 로직 누락) — 핵심 기능 절반이 작동 안 함
4. TASK 6 (autonomous_logs 필드명) — INSERT 실패
5. TASK 7 (티어 제한) — 무제한 API 사용 방지
6. TASK 5 (002 중복) — 마이그레이션 안정성
7. TASK 4 (env 크래시) — 빌드 안정성
8. TASK 8 (리다이렉트) — 보안
9. TASK 9 (잔액 음수) — 데이터 무결성
