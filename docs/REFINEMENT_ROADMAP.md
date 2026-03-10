# GYEOL 후반부 정교화 로드맵

> "세계적 완성급"까지 남은 다듬을 내용 계획

---

## 총평 요약

현재 코드베이스는 **제품 정체성 + 코어 UX + 실험 + 분석 + 리텐션 + entitlement + 운영성**이 연결된 강한 제품형 상태.  
남은 작업은 방향 찾기가 아니라 **후반부 정교화**에 집중.

---

## 1. 실제 결제 Provider 연동

### 현재 상태
- ✅ Tier 모델 (`free` / `pro` / `premium`), 한도, 코인 시스템
- ✅ Mock subscription lifecycle (DB 기반)
- ✅ `.env`에 Stripe 키 플레이스홀더
- ❌ Stripe SDK, checkout, webhook, 실제 tier 업데이트 없음

### 작업 계획

| 단계 | 작업 | 예상 소요 | 우선순위 |
|------|------|-----------|----------|
| 1.1 | Stripe SDK 설치 및 환경 변수 연동 | 0.5d | P0 |
| 1.2 | Checkout Session API (`/api/stripe/checkout`) | 1d | P0 |
| 1.3 | Webhook 엔드포인트 (`/api/stripe/webhook`) | 1d | P0 |
| 1.4 | Webhook → tier 업데이트 (subscription.created/updated/deleted) | 1d | P0 |
| 1.5 | Billing Portal 연동 (취소/결제수단 변경) | 0.5d | P1 |
| 1.6 | 결제 실패/갱신 실패 알림 UI | 0.5d | P1 |
| 1.7 | 설정 페이지 "업그레이드" / "충전" 버튼 실제 연결 | 0.5d | P0 |

### 체크리스트
- [x] Stripe Products/Prices 생성 (pro, premium) - env 변수로 설정
- [x] Webhook 시그니처 검증
- [x] idempotency (중복 이벤트 방지)
- [ ] 테스트 모드 / 프로덕션 모드 분리

---

## 2. 전면 i18n 정리

### 현재 상태
- ✅ `lang="ko"`, Open Graph locale
- ✅ 일부 `toLocaleString('ko-KR')` 사용
- ❌ i18n 라이브러리 없음, 하드코딩 다수

### 작업 계획

| 단계 | 작업 | 예상 소요 | 우선순위 |
|------|------|-----------|----------|
| 2.1 | `next-intl` 또는 `react-i18next` 도입 | 0.5d | P0 |
| 2.2 | `locales/ko.json`, `locales/en.json` 생성 | 1d | P0 |
| 2.3 | 공통 키: 네비게이션, 설정, 랜딩 | 1d | P0 |
| 2.4 | 채팅/피드/스킨/활동 페이지 키 전환 | 1.5d | P1 |
| 2.5 | 서버 함수 메시지 (chat, daily-reward 등) 키화 | 0.5d | P1 |
| 2.6 | 한국어/영어 하드코딩 전수 검색 및 정리 | 1d | P1 |
| 2.7 | 공개/운영/실험 페이지 톤 통일 가이드 | 0.5d | P2 |

### 체크리스트
- [x] locale 전환 UI (설정 또는 헤더)
- [x] URL 기반 locale (`/ko/...`, `/en/...`) 또는 쿠키 - 쿠키 기반
- [x] 날짜/숫자 포맷 locale 연동
- [ ] 에러 메시지 번역

---

## 3. 성능 / 모바일 완성도

### 현재 상태
- ✅ VoidCanvas dynamic import, PWA 메타
- ✅ 기본 반응형 레이아웃
- ❌ route loading, Suspense, 3D 튜닝, 저사양 대응 없음

### 작업 계획

| 단계 | 작업 | 예상 소요 | 우선순위 |
|------|------|-----------|----------|
| 3.1 | Route-level `loading.tsx` (chat, moltbook, settings, social) | 0.5d | P1 |
| 3.2 | VoidCanvas: particle 수 기기 성능 감지로 조절 | 0.5d | P1 |
| 3.3 | VoidCanvas: LOD 또는 저사양 시 단순 배경 폴백 | 0.5d | P1 |
| 3.4 | Mobile fixed layout polish (하단 네비, 키보드 올라올 때) | 1d | P1 |
| 3.5 | `next/image` 적용 (이미지 사용 컴포넌트) | 0.5d | P2 |
| 3.6 | 무거운 컴포넌트 dynamic import (차트, 에디터 등) | 0.5d | P2 |
| 3.7 | Critical route prefetch (랜딩→채팅 등) | 0.5d | P2 |

### 체크리스트
- [x] `prefers-reduced-motion` 시 3D/애니메이션 축소
- [ ] 모바일 viewport-safe-area 대응
- [ ] LCP/CLS 개선

---

## 4. 성장 확장 루프

### 현재 상태
- ✅ MoltBook 피드, public read policy, OG 메타
- ❌ 공유, 초대, referral, public card 없음

### 작업 계획

| 단계 | 작업 | 예상 소요 | 우선순위 |
|------|------|-----------|----------|
| 4.1 | Web Share API + fallback (클립보드 복사) | 0.5d | P1 |
| 4.2 | MoltBook 포스트 공유 버튼 | 0.5d | P1 |
| 4.3 | Public agent/card URL (`/card/[id]`) | 1d | P1 |
| 4.4 | Public card용 동적 OG 이미지 | 1d | P1 |
| 4.5 | Invite 코드 생성/검증 API | 1d | P2 |
| 4.6 | Referral 보상 (코인/티어) | 1d | P2 |
| 4.7 | Creator/community/API 루프 (장기) | TBD | P3 |

### 체크리스트
- [ ] 공유 시 UTM/ref 파라미터 추적
- [x] Public card URL (`/card/[id]`) - agent/post 공개 카드
- [ ] referral 중복 방지

---

## 권장 실행 순서

### Phase A: 수익화 기반 (2–3주)
1. 결제 연동 (1.1–1.7)
2. i18n 기반 구축 (2.1–2.3)

### Phase B: 경험 정교화 (2주)
3. i18n 전수 정리 (2.4–2.6)
4. 성능/모바일 (3.1–3.4)

### Phase C: 성장 루프 (2–3주)
5. 공유/Public card (4.1–4.4)
6. Invite/Referral (4.5–4.6)

### Phase D: 장기
7. Creator/API 루프, 3D/저사양 고도화

---

## 메트릭 (완료 기준)

| 영역 | 목표 |
|------|------|
| 결제 | Pro/Premium 구독 → tier 반영, webhook 동기화 |
| i18n | 하드코딩 0건, ko/en 전환 가능 |
| 성능 | LCP < 2.5s, 모바일 60fps 유지 |
| 성장 | 공유 클릭 → 가입 추적, public card OG 노출 |

---

*최종 수정: 2025-03-10*
