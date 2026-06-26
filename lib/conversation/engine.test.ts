import { describe, it, expect, vi, afterEach } from 'vitest';
import { judgeOrder } from '@/lib/conversation/engine';

afterEach(() => vi.restoreAllMocks());

describe('judgeOrder', () => {
  it('POSTs the judge body and returns the parsed result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reply: '好嘞!', stars: 3, tip: '好地道' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await judgeOrder({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true });
    expect(result).toEqual({ reply: '好嘞!', stars: 3, tip: '好地道' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/chat');
    expect(JSON.parse(init.body)).toEqual({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true });
  });

  it('throws on a non-ok response so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false })).rejects.toThrow();
  });
});
