import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LlmConfig } from './llmConfig';
import { PROVIDER_PRESETS } from './providers';

const deepseek = PROVIDER_PRESETS[0];

const initial: LlmConfig = {
  provider: deepseek.id,
  baseURL: deepseek.baseURL,
  apiKey: '',
  model: deepseek.defaultModel,
};

interface LlmConfigState extends LlmConfig {
  setConfig: (partial: Partial<LlmConfig>) => void;
  clear: () => void;
}

export const useLlmConfigStore = create<LlmConfigState>()(
  persist(
    (set) => ({
      ...initial,
      setConfig: (partial) => set((s) => ({ ...s, ...partial })),
      clear: () => set({ ...initial }),
    }),
    { name: 'tan-cha-llm', version: 1 },
  ),
);
