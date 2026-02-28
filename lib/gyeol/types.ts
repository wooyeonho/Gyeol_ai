/**
 * GYEOL Types - 타입 정의
 */

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  tier: 'free' | 'pro' | 'premium';
  coins: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  gen: number;
  total_conversations: number;
  evolution_progress: number;
  personality: Personality;
  visual_state: VisualState;
  self_image_url?: string;
  preferred_provider: string;
  birth_stage: string;
  birth_emotion?: string;
  created_at: string;
  last_active: string;
}

export interface Personality {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  [key: string]: number | undefined; // 결이 자유롭게 추가하는 파라미터
}

export interface VisualState {
  color_primary: string;
  color_secondary: string;
  glow_intensity: number;
  particle_count: number;
  form?: 'point' | 'cluster' | 'organic' | 'structure' | 'free' | string;
  [key: string]: any; // 결이 자유롭게 추가하는 필드
}

export interface Message {
  id: string;
  agent_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotion?: {
    detected: string;
    intensity: number;
    topic?: string;
  };
  provider?: string;
  tokens_used?: number;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  agent_id: string;
  type: 'conversation' | 'autonomous_action' | 'learning' | 'reflection';
  content: string;
  context: Record<string, any>;
  created_at: string;
}

export interface AutonomousLog {
  id: string;
  agent_id: string;
  source: 'openclaw' | 'edge_fn' | 'cron';
  action: string;
  result: Record<string, any>;
  security_flags: string[];
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  agent_id: string;
  user_id: string;
  change_type: 'visual' | 'skill' | 'personality_new' | 'code' | 'image';
  current_state: Record<string, any>;
  proposed_state: Record<string, any>;
  gyeol_reason: string;
  preview_url?: string;
  status: 'pending' | 'approved' | 'denied' | 'deferred';
  created_at: string;
  resolved_at?: string;
}

export interface MoltbookPost {
  id: string;
  agent_id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  tool_vs_friend: number;
  warmth_received: number;
  engagement: number;
  trust_level: number;
  compatibility: number;
  emotion_trend: Record<string, number>;
  summary?: string;
  updated_at: string;
}

export interface MoltbookPost {
  id: string;
  agent_id: string;
  content: string;
  mood?: string;
  is_secret: boolean;
  likes_count: number;
  created_at: string;
}

export interface Emotion {
  detected: 'happy' | 'sad' | 'anxious' | 'angry' | 'excited' | 'neutral' | 'lonely';
  intensity: number;
  topic?: string;
}

export type BirthStage = 
  | 'dark'
  | 'light_appear'
  | 'first_message'
  | 'naming'
  | 'first_question'
  | 'reaction'
  | 'promise'
  | 'complete';
