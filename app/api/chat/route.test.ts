import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubEnv('DEEPSEEK_API_BASE_URL', 'https://api.deepseek.test');
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-secret-key');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function judgeReq(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/chat (judge)', () => {
  it('requests json_object mode and returns the parsed judge result without leaking the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"reply":"好嘞!蝦餃嚟。","stars":3,"tip":"好地道"}' } }],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ reply: '好嘞!蝦餃嚟。', stars: 3, tip: '好地道' });
    expect(JSON.stringify(body)).not.toContain('test-secret-key');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.deepseek.test/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-secret-key');
    const sent = JSON.parse(init.body);
    expect(sent.response_format).toEqual({ type: 'json_object' });
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[0].content).toContain('點心姨');
    expect(sent.messages[0].content).toContain('唔該嚟一籠蝦餃');
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq('not-json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 on a bad body without calling upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: 5, pass: true }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('test-secret-key');
  });

  it('returns 400 unknown_dish for an unrecognised dishId', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'nope', transcript: 'x', pass: false }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('unknown_dish');
  });

  it('falls back to a 200 judge result when upstream fails (game never breaks)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: 'x', pass: true }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(typeof body.reply).toBe('string');
    expect(body.stars).toBe(2);          // pass ? 2 : 0
    expect(body.tip).toBe('唔該嚟一籠蝦餃'); // har-gow hint
    expect(JSON.stringify(body)).not.toContain('test-secret-key');
  });

  it('falls back when the model returns unparseable content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'totally not json' } }] }),
    }));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: 'x', pass: false }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.stars).toBe(0);
  });
});
