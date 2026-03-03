-- TASK 8: user_memories category 'speech' 추가
-- Speech patterns 저장 기능 지원

ALTER TABLE user_memories DROP CONSTRAINT IF EXISTS user_memories_category_check;
ALTER TABLE user_memories ADD CONSTRAINT user_memories_category_check
  CHECK (category IN ('taste','emotion','event','anniversary','topic','speech'));

-- TASK 17: deduct_coins RPC 함수 생성
CREATE OR REPLACE FUNCTION deduct_coins(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
DECLARE current_coins INTEGER;
BEGIN
  SELECT coins INTO current_coins FROM profiles WHERE id = p_user_id;
  IF current_coins < p_amount THEN 
    RAISE EXCEPTION 'INSUFFICIENT_COINS';
  END IF;
  UPDATE profiles SET coins = coins - p_amount, updated_at = NOW() WHERE id = p_user_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- TASK 18: agents UNIQUE(user_id) 제약 추가
-- 기존 중복 제거 (가장 오래된 것만 유지)
DELETE FROM agents a USING agents b 
WHERE a.user_id = b.user_id AND a.created_at > b.created_at;

-- UNIQUE 제약 추가
ALTER TABLE agents ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);
