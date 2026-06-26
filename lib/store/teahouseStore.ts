import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/lib/conversation/types';

export interface TeahouseState {
  messages: ChatMessage[];
  clearedDishIds: string[];
  stars: Record<string, number>;
  currentLevel: number;
  addMessage: (m: ChatMessage) => void;
  clearLevel: (id: string, stars: number) => void;
  reset: () => void;
}

const initial = {
  messages: [] as ChatMessage[],
  clearedDishIds: [] as string[],
  stars: {} as Record<string, number>,
  currentLevel: 1,
};

export const useTeahouseStore = create<TeahouseState>()(
  persist(
    (set) => ({
      ...initial,
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      clearLevel: (id, stars) =>
        set((s) => {
          const clearedDishIds = s.clearedDishIds.includes(id)
            ? s.clearedDishIds
            : [...s.clearedDishIds, id];
          const best = Math.max(s.stars[id] ?? 0, stars);
          return {
            clearedDishIds,
            stars: { ...s.stars, [id]: best },
            currentLevel: clearedDishIds.length + 1,
          };
        }),
      reset: () => set({ ...initial, stars: {} }),
    }),
    {
      name: 'tan-cha-store',
      version: 1,
      migrate: () => ({ ...initial, stars: {} }),
    },
  ),
);
