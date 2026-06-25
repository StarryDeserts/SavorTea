import { describe, it, expect, vi, afterEach } from 'vitest';
import { transcribeAudioBlob } from '@/lib/shadowing/transcribeApi';

afterEach(() => vi.restoreAllMocks());

describe('transcribeAudioBlob', () => {
  it('POSTs a wav multipart form and returns text', async () => {
    // inject a stubbed wav converter so the test does not need a real AudioContext
    const wav = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
    const convert = vi.fn().mockResolvedValue(wav);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ text: '嚟籠蝦餃' }) });
    vi.stubGlobal('fetch', fetchMock);

    const input = new Blob([new Uint8Array([9])], { type: 'audio/webm' });
    const text = await transcribeAudioBlob(input, convert);

    expect(text).toBe('嚟籠蝦餃');
    expect(convert).toHaveBeenCalledWith(input);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/transcribe');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('throws on non-ok transcription', async () => {
    const convert = vi.fn().mockResolvedValue(new Blob([], { type: 'audio/wav' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(transcribeAudioBlob(new Blob([]), convert)).rejects.toThrow();
  });
});
