import { describe, it, expect } from 'vitest';
import { PROVIDER_PRESETS, providerLabel } from '@/lib/settings/providers';

describe('providers', () => {
  it('includes the DeepSeek preset with its base URL and model', () => {
    const ds = PROVIDER_PRESETS.find((p) => p.id === 'deepseek')!;
    expect(ds.baseURL).toBe('https://api.deepseek.com');
    expect(ds.defaultModel).toBe('deepseek-v4-flash');
    expect(ds.models).toEqual(['deepseek-v4-flash', 'deepseek-v4-pro']);
  });

  it('has an empty custom preset and resolves labels by id', () => {
    const custom = PROVIDER_PRESETS.find((p) => p.id === 'custom')!;
    expect(custom.baseURL).toBe('');
    expect(custom.defaultModel).toBe('');
    expect(providerLabel('deepseek')).toBe('DeepSeek');
    expect(providerLabel('unknown')).toBe('unknown');
  });
});
