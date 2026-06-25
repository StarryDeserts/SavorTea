import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/lib/conversation/types';

export interface TeahouseState {
  messages: ChatMessage[];
  orderedDishIds: string[];
  stampedDishIds: string[];
  bestScore: number;
  addMessage: (m: ChatMessage) => void;
  markOrdered: (id: string) => void;
  addStamp: (id: string) => void;
  setBestScore: (score: number) => void;
  reset: () => void;
}

export const useTeahouseStore = create<TeahouseState>()(
  persist(
    (set) => ({
      messages: [],
      orderedDishIds: [],
      stampedDishIds: [],
      bestScore: 0,
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      markOrdered: (id) =>
        set((s) => (s.orderedDishIds.includes(id) ? s : { orderedDishIds: [...s.orderedDishIds, id] })),
      addStamp: (id) =>
        set((s) => (s.stampedDishIds.includes(id) ? s : { stampedDishIds: [...s.stampedDishIds, id] })),
      setBestScore: (score) => set((s) => ({ bestScore: Math.max(s.bestScore, score) })),
      reset: () => set({ messages: [], orderedDishIds: [], stampedDishIds: [], bestScore: 0 }),
    }),
    { name: 'tan-cha-store' },
  ),
);
