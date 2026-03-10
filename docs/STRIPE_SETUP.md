# Stripe 결제 연동 설정 가이드

## 1. Stripe 대시보드 설정

1. [Stripe Dashboard](https://dashboard.stripe.com) → Products → Add product
2. **Pro** 상품 생성 → Recurring 가격 설정 (월/년)
3. **Premium** 상품 생성 → Recurring 가격 설정
4. 각 Price의 ID 복사 (예: `price_xxxxx`)

## 2. 환경 변수

`.env.local`에 추가:

```
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
STRIPE_PRICE_PREMIUM=price_xxxxx
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## 3. Webhook 설정

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-domain.com/api/stripe/webhook`
3. 이벤트 선택: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Signing secret 복사 → `STRIPE_WEBHOOK_SECRET`

## 4. DB 마이그레이션

Supabase SQL Editor에서 실행:

```sql
-- supabase/migrations/004_stripe_fields.sql 내용 실행
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 5. 로컬 Webhook 테스트

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

출력되는 `whsec_xxx`를 `STRIPE_WEBHOOK_SECRET`에 설정.
