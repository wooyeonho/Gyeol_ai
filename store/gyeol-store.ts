/**
 * GYEOL Store - Zustand State Management
 */

import { create } from 'zustand';
import { Agent, Message, UserProfile, ApprovalRequest } from '@/lib/gyeol/types';

interface GyeolState {
  // Auth
  userId: string | null;
  isGuest: boolean;
  
  // Agent
  agent: Agent | null;
  messages: Message[];
  isLoading: boolean;
  isThinking: boolean;
  
  // User Profile
  userProfile: UserProfile | null;
  
  // Approvals
  pendingApprovals: ApprovalRequest[];
  
  // Actions
  setUserId: (userId: string | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setAgent: (agent: Agent | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsThinking: (isThinking: boolean) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setPendingApprovals: (approvals: ApprovalRequest[]) => void;
  updatePersonality: (personality: Partial<Agent['personality']>) => void;
  updateVisualState: (visualState: Partial<Agent['visual_state']>) => void;
}

export const useGyeolStore = create<GyeolState>((set) => ({
  // Initial state
  userId: null,
  isGuest: true,
  agent: null,
  messages: [],
  isLoading: false,
  isThinking: false,
  userProfile: null,
  pendingApprovals: [],
  
  // Actions
  setUserId: (userId) => set({ userId }),
  setIsGuest: (isGuest) => set({ isGuest }),
  setAgent: (agent) => set({ agent }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsThinking: (isThinking) => set({ isThinking }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),
  
  updatePersonality: (personality) => set((state) => ({
    agent: state.agent ? {
      ...state.agent,
      personality: { ...state.agent.personality, ...personality }
    } : null
  })),
  
  updateVisualState: (visualState) => set((state) => ({
    agent: state.agent ? {
      ...state.agent,
      visual_state: { ...state.agent.visual_state, ...visualState }
    } : null
  })),
}));
