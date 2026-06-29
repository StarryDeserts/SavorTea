import { describe, it, expect } from 'vitest';
import { hasLlmConfig } from '@/lib/settings/llmConfig';

describe('hasLlmConfig', () => {
  it('is true only when baseURL, apiKey and model are all set', () => {
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: 'https://x', apiKey: 'k', model: 'm' })).toBe(true);
  });

  it('is false when any of baseURL/apiKey/model is empty', () => {
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: '', apiKey: 'k', model: 'm' })).toBe(false);
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: 'https://x', apiKey: '', model: 'm' })).toBe(false);
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: 'https://x', apiKey: 'k', model: '' })).toBe(false);
  });
});
