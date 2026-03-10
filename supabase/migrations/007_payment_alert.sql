-- 결제 실패/갱신 실패 알림용
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_alert JSONB;
