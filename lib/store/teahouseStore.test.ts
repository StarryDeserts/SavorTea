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

  it('starts at level 1', () => {
    expect(useTeahouseStore.getState().currentLevel).toBe(1);
  });

  it('clearLevel records the dish, sets stars, and advances currentLevel', () => {
    useTeahouseStore.getState().clearLevel('har-gow', 3);
    const s = useTeahouseStore.getState();
    expect(s.clearedDishIds).toEqual(['har-gow']);
    expect(s.stars['har-gow']).toBe(3);
    expect(s.currentLevel).toBe(2);
  });

  it('clearLevel dedupes ids and keeps the highest stars', () => {
    const s = useTeahouseStore.getState();
    s.clearLevel('har-gow', 2);
    s.clearLevel('har-gow', 1); // lower — ignored
    s.clearLevel('har-gow', 3); // higher — kept
    const after = useTeahouseStore.getState();
    expect(after.clearedDishIds).toEqual(['har-gow']);
    expect(after.stars['har-gow']).toBe(3);
    expect(after.currentLevel).toBe(2); // still only one cleared
  });

  it('reset clears everything back to level 1', () => {
    const s = useTeahouseStore.getState();
    s.addMessage({ role: 'user', content: 'x' });
    s.clearLevel('siu-mai', 2);
    s.reset();
    const after = useTeahouseStore.getState();
    expect(after.messages).toEqual([]);
    expect(after.clearedDishIds).toEqual([]);
    expect(after.stars).toEqual({});
    expect(after.currentLevel).toBe(1);
  });
});
