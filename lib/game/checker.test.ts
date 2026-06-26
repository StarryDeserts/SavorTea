import { describe, it, expect } from 'vitest';
import { checkOrder } from '@/lib/game/checker';
import { DISHES } from '@/lib/dishes/data';

const byId = (id: string) => DISHES.find((d) => d.id === id)!;

describe('checkOrder per skill', () => {
  it('level 1 (name+polite): passes only with both', () => {
    const d = byId('har-gow');
    expect(checkOrder('唔該嚟一籠蝦餃', d).pass).toBe(true);
    expect(checkOrder('蝦餃', d).pass).toBe(false);     // no polite
    expect(checkOrder('唔該嚟一籠', d).pass).toBe(false); // no name
  });

  it('matches a dish name even when ASR returns simplified', () => {
    const d = byId('har-gow');
    // 虾饺 is the simplified putonghua form; 唔该 simplified polite
    expect(checkOrder('唔该嚟一籠虾饺', d).pass).toBe(true);
  });

  it('level 3 (name+quantity): needs a number and a measure', () => {
    const d = byId('char-siu-bao');
    expect(checkOrder('我要兩個叉燒包', d).pass).toBe(true);
    expect(checkOrder('我要叉燒包', d).pass).toBe(false); // no quantity
  });

  it('level 4 (modifier 豉汁)', () => {
    const d = byId('fung-zaau');
    expect(checkOrder('一碟豉汁鳳爪', d).pass).toBe(true);
    expect(checkOrder('一碟鳳爪', d).pass).toBe(false); // missing modifier
  });

  it('level 5 (alias 蝦腸 satisfies name)', () => {
    const d = byId('cheung-fan');
    expect(checkOrder('唔該嚟條蝦腸', d).pass).toBe(true);
    expect(checkOrder('蝦腸', d).pass).toBe(false); // no polite
  });

  it('level 7 (price): needs a price question', () => {
    const d = byId('no-mai-gai');
    expect(checkOrder('糯米雞幾錢', d).pass).toBe(true);
    expect(checkOrder('一個糯米雞', d).pass).toBe(false);
  });

  it('level 9 (multi): needs two distinct dish names', () => {
    const d = byId('maa-laai-gou');
    expect(checkOrder('切件馬拉糕,再嚟一籠蝦餃', d).pass).toBe(true);
    expect(checkOrder('切件馬拉糕', d).pass).toBe(false); // only one dish
  });

  it('level 10 (checkout)', () => {
    const d = byId('teng-zai-zuk');
    expect(checkOrder('一碗艇仔粥,唔該埋單', d).pass).toBe(true);
    expect(checkOrder('一碗艇仔粥', d).pass).toBe(false);
  });

  it('reports per-skill hit map', () => {
    const d = byId('har-gow');
    const { hit } = checkOrder('蝦餃', d);
    expect(hit.name).toBe(true);
    expect(hit.polite).toBe(false);
  });
});

describe('every dish hint passes its own level', () => {
  it('echoing task.hint clears the level', () => {
    for (const d of DISHES) {
      expect(checkOrder(d.task.hint, d).pass, d.id).toBe(true);
    }
  });
});
