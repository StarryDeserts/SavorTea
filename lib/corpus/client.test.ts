import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCorpusItem, transformCorpusItem } from '@/lib/corpus/client';

afterEach(() => vi.restoreAllMocks());

describe('fetchCorpusItem', () => {
  it('GETs the v2 corpus_item endpoint with the uuid', async () => {
    const json = { data: '蝦餃', note: { meaning: ['shrimp dumpling'] } };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(json) });
    vi.stubGlobal('fetch', fetchMock);

    const item = await fetchCorpusItem('uuid-123');

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('https://backend.aidimsum.com/v2/corpus_item?unique_id=uuid-123');
    expect(item.data).toBe('蝦餃');
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchCorpusItem('missing')).rejects.toThrow();
  });
});

describe('transformCorpusItem', () => {
  it('flattens raw item into a clean CorpusCard', () => {
    const card = transformCorpusItem('uuid-9', {
      data: '蝦餃',
      note: { meaning: ['shrimp dumpling'], context: { '粤语文本': '嚟籠蝦餃', audio: 'http://a/ctx.mp3' } },
      structured_note: {
        jyutping: 'haa1 gaau2',
        data: [{ blocks: [{ type: 'audio', url: 'http://a/word.mp3' }] }],
      },
    });
    expect(card).toEqual({
      uuid: 'uuid-9',
      yueText: '蝦餃',
      meanings: ['shrimp dumpling'],
      contextText: '嚟籠蝦餃',
      contextAudio: 'http://a/ctx.mp3',
      jyutping: 'haa1 gaau2',
      audioUrl: 'http://a/word.mp3',
    });
  });

  it('tolerates missing optional fields', () => {
    const card = transformCorpusItem('u', { data: '茶' });
    expect(card.yueText).toBe('茶');
    expect(card.meanings).toEqual([]);
    expect(card.audioUrl).toBeUndefined();
  });
});
