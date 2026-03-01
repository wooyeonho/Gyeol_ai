# GYEOL 추가 보완 지시서 v5 — "세계 최고" 수준으로 올리기 위한 잔여 이슈 전수

v4 지시서의 9개 TASK에 포함되지 않은, 추가 발견된 문제 18건입니다.
치명도 순으로 정렬했습니다.

---

## === 역할 ===

GYEOL 시니어 풀스택 개발자. 최소 변경 원칙.

## === 작업 기억 ===

- 레포: https://github.com/wooyeonho/Gyeol_ai.git
- 현재 커밋: 15c2f41
- v4 TASK 1-9와 중복 없음
- 주의: 한자/일본어 절대 금지

---

## TASK 10: 클라이언트 스트리밍 메시지 중복 표시 (치명적 UX 버그)

파일: components/ChatInterface.tsx
위치: 150행 + 199행
의도: SSE 스트리밍 시 150행에서 빈 assistant 메시지를 addMessage로 추가하고, 174행에서 updateMessage로 실시간 업데이트함. 그런데 스트리밍 완료 후 199행에서 또 addMessage(assistantMsg)를 호출. 결과: **같은 응답이 화면에 2번 표시됨**.

수정:
199행의 addMessage(assistantMsg) 블록을 조건부로 변경:
```typescript
// 스트리밍으로 이미 표시된 경우 새 메시지 추가하지 않음
if (!contentType.includes('text/event-stream')) {
  addMessage(assistantMsg);
}
```
또는 스트리밍 완료 후 updateMessage(tempId, { content: reply, emotion, provider: 'groq' })로 최종 업데이트만 수행.

### 완료 검증
```bash
# 스트리밍 경로에서 addMessage가 assistant로 2번 호출되지 않는지
grep -c 'addMessage.*assistant\|addMessage({' components/ChatInterface.tsx
# 결과: 비스트리밍 경로의 1번 + 에러의 1번 + 초기 빈 메시지 1번 = 3건 (4건이면 중복)
```

---

## TASK 11: 스킬 마켓 한자 잔존 + 하드코딩 (치명적)

파일: app/market/skills/page.tsx
위치: 14행
의도: `'データを분석해줘요'` — 일본어 カタカナ가 프로덕션에 노출됨. 추가로 id에 공백 `' storyteller'`도 있음.

수정:
```typescript
// 변경 전
{ id: 'analyst', name: '분석가', price: 350, desc: 'データを분석해줘요' },
{ id: ' storyteller', name: '이야기꾼', ... },

// 변경 후
{ id: 'analyst', name: '분석가', price: 350, desc: '데이터를 분석해줘요' },
{ id: 'storyteller', name: '이야기꾼', ... },  // 공백 제거
```

### 완료 검증
```bash
grep -c 'データ\| story' app/market/skills/page.tsx
# 결과: 0
```

---

## TASK 12: Moltbook 전체 공개 → 자기 에이전트만 필터

파일: app/moltbook/page.tsx
위치: 27행
의도: 현재 `.select('*').order(...)` — 모든 에이전트의 포스트를 가져옴. 다른 유저의 비밀 게시물까지 노출됨. RLS가 있긴 하지만 'molt_read' 정책이 `USING (true)`로 전체 공개임.

수정:
```typescript
// 변경 전
const { data } = await supabase
  .from('moltbook_posts')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);

// 변경 후
const { data } = await supabase
  .from('moltbook_posts')
  .select('*')
  .eq('agent_id', agent?.id)
  .order('created_at', { ascending: false })
  .limit(50);
```

또는 소셜 기능을 위해 공개 포스트는 유지하되 is_secret=true인 건 자기 것만:
```typescript
// 방법 2: 공개+자기것 비밀
const { data } = await supabase
  .from('moltbook_posts')
  .select('*')
  .or(`is_secret.eq.false,agent_id.eq.${agent?.id}`)
  .order('created_at', { ascending: false })
  .limit(50);
```

### 완료 검증
```bash
grep -c 'agent_id\|is_secret' app/moltbook/page.tsx
# 결과: 1 이상
```

---

## TASK 13: 스킨/스킬 구매 로직 미구현 (모두 TODO)

파일: app/market/skins/page.tsx, app/market/skills/page.tsx
의도: buySkin과 buySkill이 둘 다 `setTimeout → alert` 하드코딩. 실제 coins 차감도, DB 저장도 없음. 보유 코인도 하드코딩 100.

수정 — skins/page.tsx:
```typescript
async function buySkin(skinId: string, price: number) {
  if (!supabase || !agent) return;
  setBuying(skinId);
  
  try {
    // 1. 코인 차감 API 호출
    const response = await fetch('/api/coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: agent.user_id, amount: -price }),
    });
    
    if (!response.ok) {
      const err = await response.json();
      alert(err.error || '구매 실패');
      return;
    }
    
    // 2. 에이전트 visual_state 업데이트
    const skin = SKINS.find(s => s.id === skinId);
    if (skin) {
      await supabase.from('agents').update({
        visual_state: {
          ...agent.visual_state,
          color_primary: skin.color,
        }
      }).eq('id', agent.id);
    }
    
    alert('스킨이 적용되었습니다!');
  } catch (err) {
    alert('구매 중 오류가 발생했습니다.');
  }
  setBuying(null);
}
```

보유 코인은 profiles에서 조회:
```typescript
const [coins, setCoins] = useState(0);
useEffect(() => {
  if (!supabase || !agent) return;
  supabase.from('profiles').select('coins').eq('id', agent.user_id).single()
    .then(({ data }) => { if (data) setCoins(data.coins); });
}, [agent]);
```

skills/page.tsx도 동일한 패턴으로 구현.

### 완료 검증
```bash
grep -c 'TODO\|setTimeout.*alert' app/market/skins/page.tsx app/market/skills/page.tsx
# 결과: 0
grep -c "fetch.*coins\|profiles.*coins" app/market/skins/page.tsx
# 결과: 2 이상
```

---

## TASK 14: Navigation에서 <a> 대신 Link 사용

파일: components/Navigation.tsx
위치: 47행
의도: Next.js에서 `<a href>` 직접 사용하면 매번 풀 페이지 리로드. `<Link href>`를 써야 SPA 네비게이션. 현재 탭 이동할 때마다 전체가 리로드되어 Supabase Realtime 연결이 끊기고, 에이전트 상태를 다시 로드해야 하는 성능 문제.

수정:
```typescript
import Link from 'next/link';

// 변경 전
<a key={item.href} href={item.href} ...>

// 변경 후
<Link key={item.href} href={item.href} ...>
```

### 완료 검증
```bash
grep -c '<a ' components/Navigation.tsx
# 결과: 0
grep -c '<Link' components/Navigation.tsx
# 결과: 5 이상
```

---

## TASK 15: coin_transactions 인덱스 없음

파일: supabase/migrations/001_schema.sql
의도: coin_transactions 테이블에 인덱스가 없음. 나중에 유저별 거래 내역 조회가 느려짐.

수정:
파일 끝에 추가:
```sql
CREATE INDEX idx_coin_tx_user ON coin_transactions(user_id, created_at DESC);
```

### 완료 검증
```bash
grep 'idx_coin_tx' supabase/migrations/001_schema.sql
# 결과: 1건
```

---

## TASK 16: manifest.json + PWA 메타태그

파일: public/manifest.json (확인 필요), app/layout.tsx
의도: manifest.json이 layout.tsx에 참조되어 있지만 실제 파일 존재 여부 미확인. PWA를 위한 기본 메타태그도 없음.

수정 1 — public/manifest.json 확인/생성:
```json
{
  "name": "결 - GYEOL",
  "short_name": "결",
  "description": "대화할수록 성장하는 나만의 AI",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#4F46E5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

수정 2 — app/layout.tsx <head>에 추가:
```html
<meta name="theme-color" content="#000000" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
```

### 완료 검증
```bash
test -f public/manifest.json && echo "OK" || echo "MISSING"
grep 'theme-color\|apple-mobile' app/layout.tsx
```

---

## TASK 17: Settings 페이지에서 프로필 코인/티어 실시간 연동

파일: app/settings/page.tsx
위치: 16행
의도: `const [tier] = useState('free')` — tier가 하드코딩. profiles 테이블에서 실제 tier와 coins를 불러와야 함.

수정:
```typescript
const [tier, setTier] = useState('free');
const [coins, setCoins] = useState(0);
const supabase = createClient();

useEffect(() => {
  if (!supabase || !agent) return;
  supabase.from('profiles').select('tier, coins').eq('id', agent.user_id).single()
    .then(({ data }) => {
      if (data) {
        setTier(data.tier);
        setCoins(data.coins);
      }
    });
}, [agent]);
```

### 완료 검증
```bash
grep -c "useState('free')" app/settings/page.tsx
# 결과: 0 (하드코딩 제거됨)
grep -c "profiles.*tier\|profiles.*coins" app/settings/page.tsx
# 결과: 1 이상
```

---

## TASK 18: 소셜 매칭 하드코딩 더미 데이터 제거

파일: app/social/matches/page.tsx
위치: 21-25행
의도: setTimeout으로 하드코딩 더미 데이터 반환. 실제 매칭 API 없음.

수정 (최소 기능):
```typescript
useEffect(() => {
  if (!supabase) return;
  // 다른 유저의 에이전트 중 공개 프로필만 조회
  supabase
    .from('agents')
    .select('id, name, gen, personality')
    .neq('user_id', userId)  // 자기 자신 제외
    .limit(10)
    .then(({ data }) => {
      if (data) setMatches(data);
      setLoading(false);
    });
}, [supabase, userId]);
```

주의: RLS 정책상 다른 유저의 agents를 볼 수 없음. 소셜 기능 전용 RLS 정책 추가 필요:
```sql
CREATE POLICY "agents_public_read" ON agents FOR SELECT
  USING (true);  -- 또는 공개 프로필만
```
이 정책은 사용자 프라이버시 문제가 있으므로, 별도 public_agents 뷰를 만드는 것이 더 안전.

### 완료 검증
```bash
grep -c 'setTimeout\|바다.*나무.*별' app/social/matches/page.tsx
# 결과: 0
```

---

## TASK 19: EnergyBar 음수/초과 방지

파일: components/EnergyBar.tsx
의도: energy 값이 0 미만이거나 100 초과일 때 UI가 깨질 수 있음.

수정:
```typescript
const clampedEnergy = Math.max(0, Math.min(100, energy));
// width에 clampedEnergy 사용
```

### 완료 검증
```bash
grep -c 'clamp\|Math.max.*Math.min' components/EnergyBar.tsx
# 결과: 1 이상
```

---

## TASK 20: deep-brain에서 에이전트 이름 조회 실패 시 크래시

파일: supabase/functions/deep-brain/index.ts
의도: agent가 null일 때 `agent.name`에서 크래시. 현재 null 체크 없음.

수정:
모든 agent 참조에 옵셔널 체이닝 추가:
```typescript
const agentName = agent?.name || '결';
const personality = agent?.personality || { warmth: 50, creativity: 50 };
```

### 완료 검증
```bash
grep -c 'agent\?\.name\|agent\?\.personality' supabase/functions/deep-brain/index.ts
# 결과: 2 이상
```

---

## TASK 21: conversations 테이블에 role 인덱스 없음

파일: supabase/migrations/001_schema.sql
의도: 티어 제한에서 `WHERE role='user' AND created_at >= today`로 쿼리하는데, role에 인덱스가 없으면 풀스캔.

수정:
```sql
CREATE INDEX idx_conv_user_role ON conversations(user_id, role, created_at DESC);
```

### 완료 검증
```bash
grep 'idx_conv_user_role' supabase/migrations/001_schema.sql
# 결과: 1건
```

---

## TASK 22: 채팅 입력 XSS 방지

파일: supabase/functions/chat/index.ts
의도: 유저 메시지가 DB에 직접 저장되고, 다른 유저(소셜 기능)에게 노출될 수 있음. HTML 태그 삽입 가능.

수정:
chat Edge Function 시작부에 메시지 산타이즈:
```typescript
const sanitizedMessage = message
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .slice(0, 2000);  // 최대 길이 제한도 추가
```

### 완료 검증
```bash
grep -c 'sanitize\|replace.*<\|slice.*2000' supabase/functions/chat/index.ts
# 결과: 2 이상
```

---

## TASK 23: next.config에 headers 보안 추가

파일: next.config.js
의도: 보안 헤더 없음. XSS, clickjacking, MIME 스니핑 방지.

수정:
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      ],
    },
  ];
},
```

### 완료 검증
```bash
grep -c 'X-Frame\|nosniff\|XSS-Protection' next.config.js
# 결과: 3
```

---

## TASK 24: Moltbook 다이어리 카드 UI 개선

파일: app/moltbook/page.tsx
의도: v3 TASK 9에서 요구했던 카드 UI가 여전히 일반 리스트. 다이어리 느낌이 없음.

수정:
- 각 포스트를 `bg-white/5 rounded-2xl p-4` 카드로
- 상단에 날짜 + 타입 뱃지 (기존 mood 활용)
- mood별 좌측 테두리 색 (happy=금, sad=파랑, neutral=회색)
- 꿈 포스트는 `bg-indigo-900/10` 배경 구분

### 완료 검증
```bash
grep -c 'rounded-2xl\|border-l\|badge\|bg-indigo' app/moltbook/page.tsx
# 결과: 3 이상
```

---

## TASK 25: Activity 페이지에 진화 히스토리 타임라인

파일: app/activity/page.tsx, components/ActivityFeed.tsx
의도: 현재 autonomous_logs를 JSON.stringify로 날것 그대로 보여줌. 유저 친화적이지 않음.

수정:
ActivityFeed.tsx에서 action별 한국어 매핑:
```typescript
const actionLabels: Record<string, string> = {
  'personality_evolve': '성격 변화',
  'ai_personality_evolve': 'AI 기반 성격 진화',
  'evolution': '진화!',
  'daily_reflection': '하루 성찰',
  'learner': '자율 학습',
  'curiosity': '호기심 활동',
  'emotion_analysis': '감정 분석',
  'moltbook_generated': '일기 작성',
};

// result를 보기 좋게 변환
function formatResult(action: string, result: any): string {
  if (action === 'evolution') return `Gen ${result.from_gen} → Gen ${result.to_gen}`;
  if (action === 'learner' && result.learned) return result.learned.slice(0, 80);
  if (action === 'daily_reflection' && result.summary) return result.summary.slice(0, 80);
  if (typeof result === 'object') return JSON.stringify(result).slice(0, 80);
  return String(result).slice(0, 80);
}
```

### 완료 검증
```bash
grep -c 'actionLabels\|formatResult\|성격 변화\|진화!' components/ActivityFeed.tsx
# 결과: 3 이상
```

---

## TASK 26: Error Boundary에서 Supabase 세션 복구

파일: app/error.tsx
의도: 에러 발생 후 reset()으로 복구할 때 Supabase 세션이 끊어질 수 있음.

수정:
```typescript
function handleReset() {
  // 세션 복구 시도 후 리셋
  const supabase = createClient();
  supabase?.auth.getSession().then(() => reset());
}
```

### 완료 검증
```bash
grep -c 'getSession\|supabase' app/error.tsx
# 결과: 1 이상
```

---

## TASK 27: SEO + OG 메타태그

파일: app/layout.tsx
의도: 소셜 미디어 공유 시 미리보기가 없음.

수정 — metadata에 추가:
```typescript
export const metadata: Metadata = {
  title: '결 - GYEOL',
  description: '대화할수록 성장하고 진화하는 나만의 AI',
  manifest: '/manifest.json',
  openGraph: {
    title: '결 - GYEOL',
    description: '대화할수록 성장하고 진화하는 나만의 AI',
    url: 'https://gyeol.vercel.app',
    siteName: '결 GYEOL',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '결 - GYEOL',
    description: '대화할수록 성장하고 진화하는 나만의 AI',
  },
};
```

### 완료 검증
```bash
grep -c 'openGraph\|twitter' app/layout.tsx
# 결과: 2
```

---

## === 전체 우선순위 (v4 + v5 통합) ===

### 즉시 수정 (서비스 장애 수준)
1. v4 TASK 2: 대화 중복 저장
2. v4 TASK 3: 스트리밍 후 로직 미실행
3. v5 TASK 10: 클라이언트 메시지 2번 표시
4. v4 TASK 1: 한자 9건
5. v5 TASK 11: 스킬 마켓 한자 + 공백 ID

### 긴급 (기능 불완전)
6. v4 TASK 6: autonomous_logs 필드명
7. v4 TASK 7: 티어 제한 없음
8. v5 TASK 12: Moltbook 비밀 게시물 노출
9. v5 TASK 13: 스킨/스킬 구매 미구현
10. v5 TASK 14: Navigation 풀 리로드

### 중요 (품질/보안)
11. v5 TASK 22: XSS 방지
12. v5 TASK 23: 보안 헤더
13. v4 TASK 9: 코인 잔액 음수
14. v5 TASK 20: deep-brain null 크래시
15. v4 TASK 5: 002 중복 테이블

### 완성도 (UX/SEO)
16. v5 TASK 24: Moltbook 카드 UI
17. v5 TASK 25: Activity 한국어 매핑
18. v5 TASK 17: Settings 실제 연동
19. v5 TASK 27: OG 메타태그
20. v5 TASK 16: PWA manifest
21. v5 TASK 26: Error 세션 복구

### 후순위 (인프라)
22. v4 TASK 4: env 크래시 방지
23. v4 TASK 8: 리다이렉트
24. v5 TASK 15: coin_transactions 인덱스
25. v5 TASK 21: conversations role 인덱스
26. v5 TASK 18: 소셜 매칭 (RLS 설계 필요)
27. v5 TASK 19: EnergyBar clamp

---

## === 이 전부 완료 시 예상 상태 ===

- 한자/일본어: 0건
- 중복 저장/표시: 해결
- 스트리밍 경로 전체 기능: 작동
- 보안: XSS + 헤더 + 잔액검증 + 티어제한
- UX: 카드 UI, 한국어 라벨, SPA 네비게이션, PWA
- SEO: OG 태그, manifest
- 마켓: 실제 코인 차감 + DB 연동

MVP 완성도: 88% → 97%
전체 완성도: 45% → 65%
(나머지 35%는 Telegram, 관리자 대시보드, Oracle Cloud 이전, 실제 OpenClaw Koyeb 배포)
