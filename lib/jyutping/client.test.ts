import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJyutping } from '@/lib/jyutping/client';

afterEach(() => vi.restoreAllMocks());

describe('fetchJyutping', () => {
  it('POSTs the text and returns content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ content: 'haa1 gaau2' }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJyutping('蝦餃');

    expect(result).toBe('haa1 gaau2');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/to_jyutping');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ text: '蝦餃' });
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchJyutping('x')).rejects.toThrow();
  });
});
