import { describe, it, expect, vi, afterEach } from 'vitest';
import { judgeOrder } from '@/lib/conversation/engine';

afterEach(() => vi.restoreAllMocks());

const CONFIG = { provider: 'deepseek', baseURL: 'https://prov.test', apiKey: 'sk-user', model: 'deepseek-chat' };

describe('judgeOrder', () => {
  it('POSTs the judge body to /api/chat when no LLM config is set', async () => {
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

  it('throws on a non-ok /api/chat response so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false })).rejects.toThrow();
  });

  it('with config, calls the provider directly with the user key and NEVER /api/chat', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{"reply":"好嘞!","stars":3,"tip":"好"}' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await judgeOrder({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true }, CONFIG);
    expect(result).toEqual({ reply: '好嘞!', stars: 3, tip: '好' });

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain('https://prov.test/chat/completions');
    expect(urls).not.toContain('/api/chat'); // key 不经本站服务器
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-user');
  });

  it('with config, throws when the provider returns unparseable content (OrderChat falls back)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'not json' } }] }),
    }));
    await expect(
      judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false }, CONFIG),
    ).rejects.toThrow();
  });
});
