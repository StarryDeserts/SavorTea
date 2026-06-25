import { describe, it, expect } from 'vitest';
import { DISHES } from '@/lib/dishes/data';

describe('DISHES seed', () => {
  it('has 10 dishes with unique ids', () => {
    expect(DISHES).toHaveLength(10);
    const ids = new Set(DISHES.map((d) => d.id));
    expect(ids.size).toBe(10);
  });

  it('every dish has non-empty required fields', () => {
    for (const d of DISHES) {
      for (const key of ['nameYue', 'jyutping', 'namePutonghua', 'nameEn', 'emoji', 'culturalNote', 'orderPhrase', 'orderPhraseJyutping'] as const) {
        expect(d[key], `${d.id}.${key}`).toBeTruthy();
      }
    }
  });

  it('includes 蝦餃 with a Cantonese order phrase', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow');
    expect(harGow?.nameYue).toBe('蝦餃');
    expect(harGow?.orderPhrase).toContain('蝦餃');
  });
});
