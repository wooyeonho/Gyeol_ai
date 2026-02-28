/**
 * GYEOL Constants
 */

export const GYEOL_NAME = '결';

export const GEN_THRESHOLDS = [
  { gen: 2, conversations: 20 },
  { gen: 3, conversations: 50 },
  { gen: 4, conversations: 100 },
  { gen: 5, conversations: 200 },
  { gen: 6, conversations: 350 },
  { gen: 7, conversations: 500 },
  { gen: 8, conversations: 750 },
  { gen: 9, conversations: 1000 },
  { gen: 10, conversations: 1500 },
];

export const PERSONALITY_COLORS: Record<string, string> = {
  warmth: '#F59E0B',   // amber
  logic: '#06B6D4',   // cyan
  creativity: '#A855F7', // purple
  energy: '#22C55E',  // green
  humor: '#EAB308',   // yellow
};

export const DEFAULT_VISUAL = {
  color_primary: '#FFFFFF',
  color_secondary: '#4F46E5',
  glow_intensity: 0.3,
  particle_count: 10,
  form: 'point',
};

export const AI_PROVIDERS = {
  groq: {
    name: 'Groq',
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    free: true,
  },
  deepseek: {
    name: 'DeepSeek',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    free: false,
  },
  gemini: {
    name: 'Gemini',
    model: 'gemini-2.0-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    free: true,
  },
};

export const TIER_LIMITS = {
  free: {
    daily_conversations: 20,
    voice_messages: 1,
    self_modify: false,
    advanced_skins: false,
  },
  pro: {
    daily_conversations: 100,
    voice_messages: 10,
    self_modify: true,
    advanced_skins: true,
  },
  premium: {
    daily_conversations: -1, // 무제한
    voice_messages: -1,
    self_modify: true,
    advanced_skins: true,
  },
};
