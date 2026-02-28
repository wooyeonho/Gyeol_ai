# GYEOL (결)

> "뭐가 될지 아무도 모른다. 그게 핵심이다."

자율 진화 AI 생명체 플랫폼

## 시작하기

### 1. Supabase 설정
1. supabase.com → 새 프로젝트 생성
2. `supabase/migrations/001_schema.sql` SQL Editor에서 실행
3. API URL과 anon key 복사

### 2. 환경변수 설정
```bash
cp .env.example .env.local
# .env.local에 API 키 입력
```

### 3. 의존성 설치
```bash
npm install
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 프로젝트 구조

```
gyeol/
├── app/                    # Next.js 15 App Router
│   ├── page.tsx           # 메인 (탄생 or 채팅)
│   └── globals.css        # 글로벌 스타일
├── components/             # UI 컴포넌트
│   ├── VoidCanvas.tsx    # 3D 비주얼
│   ├── ChatInterface.tsx  # 채팅 UI
│   └── BirthSequence.tsx  # 탄생 시퀀스
├── lib/                   # 유틸리티
│   ├── supabase/         # Supabase 클라이언트
│   └── gyeol/            # GYEOL 타입/상수
├── store/                 # Zustand 상태管理
├── supabase/
│   ├── migrations/       # DB 스키마
│   └── functions/        # Edge Functions
└── openclaw-deploy/      # OpenClaw 배포
    ├── Dockerfile
    └── workspace/        # AGENT.md, HEARTBEAT.md, skills/
```

## 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **3D**: React Three Fiber
- **State**: Zustand
- **Backend**: Supabase (Edge Functions)
- **AI**: Groq, DeepSeek, Gemini
- **Autonomy**: OpenClaw

## 문서

전체 개발 가이드: `GYEOL_FINAL_MASTER_GUIDE_v6_SUCCESS.docx`

## 라이선스

비공개 프로젝트
