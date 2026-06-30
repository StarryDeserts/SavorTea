import { describe, it, expect, beforeEach } from 'vitest';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';

beforeEach(() => useLlmConfigStore.getState().clear());

describe('useLlmConfigStore', () => {
  it('persists under the tan-cha-llm key and starts with the DeepSeek preset and empty key', () => {
    expect(useLlmConfigStore.persist.getOptions().name).toBe('tan-cha-llm');
    const s = useLlmConfigStore.getState();
    expect(s.provider).toBe('deepseek');
    expect(s.baseURL).toBe('https://api.deepseek.com');
    expect(s.model).toBe('deepseek-v4-flash');
    expect(s.apiKey).toBe('');
  });

  it('merges partial config and clears back to defaults', () => {
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user', provider: 'openai' });
    expect(useLlmConfigStore.getState().apiKey).toBe('sk-user');
    expect(useLlmConfigStore.getState().provider).toBe('openai');
    useLlmConfigStore.getState().clear();
    expect(useLlmConfigStore.getState().apiKey).toBe('');
    expect(useLlmConfigStore.getState().provider).toBe('deepseek');
  });
});
