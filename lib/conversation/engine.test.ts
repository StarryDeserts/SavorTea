import { describe, it, expect, vi, afterEach } from 'vitest';
import { judgeOrder } from '@/lib/conversation/engine';
import { FALLBACK_LINES } from '@/lib/conversation/persona';

afterEach(() => vi.restoreAllMocks());

const CONFIG = { provider: 'deepseek', baseURL: 'https://prov.test', apiKey: 'sk-user', model: 'deepseek-chat' };

describe('judgeOrder', () => {
  it('without config, returns a deterministic fallback WITHOUT any network call (pass=true)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.stars).toBe(2);
    expect(result.tip).toBe('唔該嚟一籠蝦餃');
    expect(typeof result.reply).toBe('string');
    expect(FALLBACK_LINES).toContain(result.reply);
  });

  it('without config and pass=false, fallback has stars=0', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.stars).toBe(0);
    expect(result.tip).toBe('唔該嚟一籠蝦餃');
    expect(typeof result.reply).toBe('string');
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

  it('with config, returns a fallback when the provider returns unparseable content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'not json' } }] }),
    }));

    const result = await judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false }, CONFIG);

    expect(result.stars).toBe(0);
    expect(result.tip).toBe('唔該嚟一籠蝦餃');
    expect(typeof result.reply).toBe('string');
    expect(FALLBACK_LINES).toContain(result.reply);
  });
});
