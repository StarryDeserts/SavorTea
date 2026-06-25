import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubEnv('DEEPSEEK_API_BASE_URL', 'https://api.deepseek.test');
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-secret-key');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('POST /api/chat', () => {
  it('injects the system prompt server-side and returns the reply without leaking the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '好嘞!蝦餃即刻嚟。' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '嚟一籠蝦餃' }] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe('好嘞!蝦餃即刻嚟。');
    expect(JSON.stringify(body)).not.toContain('test-secret-key');

    // upstream got system prompt prepended + bearer auth
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.deepseek.test/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-secret-key');
    const sent = JSON.parse(init.body);
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[0].content).toContain('點心姨');
    expect(sent.messages[1]).toEqual({ role: 'user', content: '嚟一籠蝦餃' });
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: 'not-json' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 502 when upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});
