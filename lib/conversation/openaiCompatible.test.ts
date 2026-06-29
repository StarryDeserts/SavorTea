import { describe, it, expect, vi, afterEach } from 'vitest';
import { postChatCompletions } from '@/lib/conversation/openaiCompatible';

afterEach(() => vi.restoreAllMocks());

describe('postChatCompletions', () => {
  it('posts to {baseURL}/chat/completions with bearer auth and returns content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'hello' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const out = await postChatCompletions({
      baseURL: 'https://prov.test',
      apiKey: 'sk-user',
      model: 'm-1',
      messages: [{ role: 'user', content: 'hi' }],
      jsonMode: true,
    });

    expect(out).toBe('hello');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://prov.test/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-user');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe('m-1');
    expect(sent.response_format).toEqual({ type: 'json_object' });
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(
      postChatCompletions({ baseURL: 'https://prov.test', apiKey: 'k', model: 'm', messages: [] }),
    ).rejects.toThrow();
  });
});
