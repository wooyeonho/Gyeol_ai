-- Invite / Referral 시스템
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL REFERENCES invite_codes(code) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(code, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_invite_inviter ON invite_codes(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referral_referred ON referral_uses(referred_id);

-- profiles에 초대 추적용 필드
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code_used TEXT;

-- RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invite_inviter" ON invite_codes FOR ALL USING (auth.uid() = inviter_id);
CREATE POLICY "referral_own" ON referral_uses FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = referred_id);
