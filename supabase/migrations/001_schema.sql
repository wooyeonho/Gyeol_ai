-- ============================================
-- GYEOL v6 Database Schema
-- Supabase SQL Editor에서 실행
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. profiles (유저)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '여행자',
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','premium')),
  coins INTEGER NOT NULL DEFAULT 100 CHECK (coins >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. agents (결 인스턴스, 유저당 1개)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '결',
  gen INTEGER NOT NULL DEFAULT 1 CHECK (gen BETWEEN 1 AND 10),
  total_conversations INTEGER NOT NULL DEFAULT 0,
  evolution_progress DECIMAL(5,2) NOT NULL DEFAULT 0,
  personality JSONB NOT NULL DEFAULT '{"warmth":50,"logic":50,"creativity":50,"energy":50,"humor":50}',
  visual_state JSONB NOT NULL DEFAULT '{"color_primary":"#FFFFFF","color_secondary":"#4F46E5","glow_intensity":0.3,"particle_count":10,"form":"point"}',
  self_image_url TEXT,
  preferred_provider TEXT DEFAULT 'groq',
  birth_stage TEXT DEFAULT 'complete',
  birth_emotion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. conversations (대화)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  emotion JSONB,
  provider TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. memories (벡터 기억)
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'conversation',
  content TEXT NOT NULL,
  embedding VECTOR(384),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. autonomous_logs (결의 자율 행동 기록)
CREATE TABLE autonomous_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'openclaw',
  action TEXT NOT NULL,
  result JSONB DEFAULT '{}',
  security_flags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. approval_queue (결이 바꾸고 싶은 것들)
CREATE TABLE approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  current_state JSONB,
  proposed_state JSONB NOT NULL,
  gyeol_reason TEXT,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 7. user_profiles (결이 유저를 분석한 결과)
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tool_vs_friend INTEGER DEFAULT 0,
  warmth_received INTEGER DEFAULT 50,
  engagement INTEGER DEFAULT 50,
  trust_level INTEGER DEFAULT 50,
  compatibility INTEGER DEFAULT 50,
  emotion_trend JSONB DEFAULT '{}',
  summary TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. system_state (Kill Switch 등)
CREATE TABLE system_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO system_state (key, value) VALUES ('kill_switch', '{"active": false}');

-- 9. moltbook_posts (AI SNS)
CREATE TABLE moltbook_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT,
  is_secret BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. push_subscriptions (웹 푸시)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. coin_transactions (코인 거래)
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  type TEXT DEFAULT 'reward',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_agents_user ON agents(user_id);
CREATE INDEX idx_conv_agent ON conversations(agent_id, created_at DESC);
CREATE INDEX idx_conv_user ON conversations(user_id, created_at DESC);
CREATE INDEX idx_memories_user ON memories(user_id, created_at DESC);
CREATE INDEX idx_memories_type ON memories(user_id, type, created_at DESC);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_auto_logs ON autonomous_logs(agent_id, created_at DESC);
CREATE INDEX idx_approval ON approval_queue(user_id, status, created_at DESC);
CREATE INDEX idx_moltbook ON moltbook_posts(created_at DESC);
CREATE INDEX idx_push ON push_subscriptions(user_id);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE moltbook_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- profiles: 자기 것만
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- agents: 자기 것만
CREATE POLICY "agents_own" ON agents FOR ALL USING (auth.uid() = user_id);

-- conversations: 자기 것만
CREATE POLICY "conv_own" ON conversations FOR ALL USING (auth.uid() = user_id);

-- memories: 자기 것만
CREATE POLICY "mem_own" ON memories FOR ALL USING (auth.uid() = user_id);

-- autonomous_logs: 읽기만
CREATE POLICY "logs_read" ON autonomous_logs FOR SELECT
  USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- approval_queue: 자기 것만
CREATE POLICY "approval_own" ON approval_queue FOR ALL USING (auth.uid() = user_id);

-- user_profiles: 자기 것만
CREATE POLICY "up_own" ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- system_state: 읽기만
CREATE POLICY "sys_read" ON system_state FOR SELECT USING (true);

-- moltbook: 전체 읽기, 자기만 쓰기
CREATE POLICY "molt_read" ON moltbook_posts FOR SELECT USING (true);
CREATE POLICY "molt_write" ON moltbook_posts FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

-- push_subscriptions
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- coin_transactions
CREATE POLICY "coin_own" ON coin_transactions FOR ALL USING (auth.uid() = user_id);

-- 벡터 검색 함수
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(384),
  target_user_id UUID,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, type TEXT, similarity FLOAT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.type,
    (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity,
    m.created_at
  FROM memories m
  WHERE m.user_id = target_user_id
    AND (1 - (m.embedding <=> query_embedding)) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END; $$;

-- 회원가입 시 profiles 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', '여행자'));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 회원가입 시 agents 자동 생성
CREATE OR REPLACE FUNCTION handle_new_agent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agents (user_id, name, personality, visual_state)
  VALUES (NEW.id, '결', '{"warmth":50,"logic":50,"creativity":50,"energy":50,"humor":50}', '{"color_primary":"#FFFFFF","color_secondary":"#4F46E5","glow_intensity":0.3,"particle_count":10,"form":"point"}');
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_agent
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_agent();
