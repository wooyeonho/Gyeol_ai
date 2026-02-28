/**
 * TASK 2: 장기 기억 DB 마이그레이션
 * user_memories + agent_status 테이블
 */

-- 사용자 기억 테이블
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('taste', 'emotion', 'event', 'anniversary', 'topic')),
  content TEXT NOT NULL,
  importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
  source TEXT DEFAULT 'conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 에이전트 상태 테이블
CREATE TABLE IF NOT EXISTS agent_status (
  agent_id UUID PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  condition TEXT DEFAULT 'normal' CHECK (condition IN ('good', 'normal', 'bad', 'sleepy')),
  mood TEXT DEFAULT 'neutral',
  energy INTEGER DEFAULT 100 CHECK (energy BETWEEN 0 AND 100),
  intimacy_score INTEGER DEFAULT 0,
  last_dream TEXT,
  last_condition_update TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "um_own" ON user_memories FOR ALL USING (
  auth.uid() = user_id
);

CREATE POLICY "as_own" ON agent_status FOR ALL USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_um_agent ON user_memories(agent_id, category, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_um_user ON user_memories(user_id, created_at DESC);

-- 에이전트 생성 시 agent_status 자동 생성 함수
CREATE OR REPLACE FUNCTION create_agent_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_status (agent_id, condition, mood, energy, intimacy_score)
  VALUES (NEW.id, 'normal', 'neutral', 100, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거
DROP TRIGGER IF EXISTS on_agent_created ON agents;
CREATE TRIGGER on_agent_created
  AFTER INSERT ON agents
  FOR EACH ROW
  EXECUTE FUNCTION create_agent_status();
