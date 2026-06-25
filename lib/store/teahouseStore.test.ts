import { describe, it, expect, beforeEach } from 'vitest';
import { useTeahouseStore } from '@/lib/store/teahouseStore';

beforeEach(() => {
  useTeahouseStore.getState().reset();
  localStorage.clear();
});

describe('useTeahouseStore', () => {
  it('appends messages', () => {
    useTeahouseStore.getState().addMessage({ role: 'user', content: '嚟蝦餃' });
    expect(useTeahouseStore.getState().messages).toHaveLength(1);
  });

  it('dedupes ordered and stamped dish ids', () => {
    const s = useTeahouseStore.getState();
    s.markOrdered('har-gow');
    s.markOrdered('har-gow');
    s.addStamp('har-gow');
    s.addStamp('har-gow');
    expect(useTeahouseStore.getState().orderedDishIds).toEqual(['har-gow']);
    expect(useTeahouseStore.getState().stampedDishIds).toEqual(['har-gow']);
  });

  it('keeps the highest best score only', () => {
    const s = useTeahouseStore.getState();
    s.setBestScore(70);
    s.setBestScore(40);
    expect(useTeahouseStore.getState().bestScore).toBe(70);
    s.setBestScore(95);
    expect(useTeahouseStore.getState().bestScore).toBe(95);
  });

  it('reset clears everything', () => {
    const s = useTeahouseStore.getState();
    s.addMessage({ role: 'user', content: 'x' });
    s.markOrdered('siu-mai');
    s.reset();
    const after = useTeahouseStore.getState();
    expect(after.messages).toEqual([]);
    expect(after.orderedDishIds).toEqual([]);
    expect(after.stampedDishIds).toEqual([]);
    expect(after.bestScore).toBe(0);
  });
});
