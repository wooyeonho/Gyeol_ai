-- 초대자 보상 컬럼 추가
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS inviter_reward_coins INTEGER NOT NULL DEFAULT 5;
