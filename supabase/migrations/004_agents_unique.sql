-- 중복 에이전트 제거 (오래된 것 삭제)
DELETE FROM agents a USING agents b WHERE a.user_id = b.user_id AND a.created_at > b.created_at;
ALTER TABLE agents ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);
