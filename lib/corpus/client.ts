import type { CorpusItem, CorpusCard } from './types';

export const CORPUS_API_BASE = 'https://backend.aidimsum.com';

export async function fetchCorpusItem(uuid: string): Promise<CorpusItem> {
  const res = await fetch(`${CORPUS_API_BASE}/v2/corpus_item?unique_id=${encodeURIComponent(uuid)}`);
  if (!res.ok) throw new Error(`Corpus fetch failed: ${res.status}`);
  return (await res.json()) as CorpusItem;
}

function firstAudioBlock(item: CorpusItem): string | undefined {
  const blocks = item.structured_note?.data?.[0]?.blocks ?? [];
  const audio = blocks.find((b) => b.type === 'audio' || b.type === '音频');
  return audio?.url ?? audio?.audio;
}

export function transformCorpusItem(uuid: string, item: CorpusItem): CorpusCard {
  return {
    uuid,
    yueText: item.data ?? '',
    meanings: item.note?.meaning ?? [],
    contextText: item.note?.context?.['粤语文本'],
    contextAudio: item.note?.context?.audio,
    jyutping: item.structured_note?.jyutping,
    audioUrl: firstAudioBlock(item),
  };
}
