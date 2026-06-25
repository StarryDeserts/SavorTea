import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectOrderedDishes, sendChat } from '@/lib/conversation/engine';
import { FALLBACK_LINES } from '@/lib/conversation/persona';
import { DISHES } from '@/lib/dishes/data';

afterEach(() => vi.restoreAllMocks());

describe('detectOrderedDishes', () => {
  it('matches dishes by Cantonese name', () => {
    const found = detectOrderedDishes('唔該嚟一籠蝦餃同埋燒賣', DISHES);
    expect(found.map((d) => d.id).sort()).toEqual(['har-gow', 'siu-mai']);
  });
  it('matches dishes by Putonghua name', () => {
    const found = detectOrderedDishes('我要虾饺', DISHES);
    expect(found.map((d) => d.id)).toEqual(['har-gow']);
  });
  it('returns empty when nothing matches', () => {
    expect(detectOrderedDishes('你好', DISHES)).toEqual([]);
  });
});

describe('sendChat', () => {
  it('returns the reply on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ reply: '好嘞!' }) }));
    const reply = await sendChat([{ role: 'user', content: '嚟蝦餃' }]);
    expect(reply).toBe('好嘞!');
  });
  it('returns a fallback line on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const reply = await sendChat([{ role: 'user', content: 'x' }]);
    expect(FALLBACK_LINES).toContain(reply);
  });
  it('returns a fallback line on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    const reply = await sendChat([{ role: 'user', content: 'x' }]);
    expect(FALLBACK_LINES).toContain(reply);
  });
});
