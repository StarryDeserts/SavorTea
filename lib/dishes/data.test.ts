import { describe, it, expect } from 'vitest';
import { DISHES } from '@/lib/dishes/data';
import type { OrderSkill } from '@/lib/dishes/types';

const ALL_SKILLS: OrderSkill[] = ['name', 'polite', 'quantity', 'modifier', 'alias', 'price', 'multi', 'checkout'];

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

describe('DISHES tasks', () => {
  it('every dish has a task with level 1..10 in menu order and a non-empty goal/hint', () => {
    DISHES.forEach((d, i) => {
      expect(d.task, d.id).toBeTruthy();
      expect(d.task.level, d.id).toBe(i + 1);
      expect(d.task.goal, d.id).toBeTruthy();
      expect(d.task.hint, d.id).toBeTruthy();
      expect(d.task.skills.length, d.id).toBeGreaterThan(0);
      d.task.skills.forEach((s) => expect(ALL_SKILLS).toContain(s));
    });
  });

  it('skills imply their config: alias level has aliases, modifier level has modifiers', () => {
    for (const d of DISHES) {
      if (d.task.skills.includes('alias')) expect(d.task.aliases?.length, d.id).toBeGreaterThan(0);
      if (d.task.skills.includes('modifier')) expect(d.task.modifiers?.length, d.id).toBeGreaterThan(0);
    }
  });
});
