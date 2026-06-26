import { describe, it, expect } from 'vitest';
import { normalizeForCompare } from '@/lib/shadowing/normalize';
import {
  containsAny,
  hasPolite,
  hasNumber,
  hasMeasure,
  hasQuantity,
  hasPrice,
  hasCheckout,
} from '@/lib/game/vocab';

const n = normalizeForCompare;

describe('containsAny', () => {
  it('matches across traditional/simplified by normalizing both sides', () => {
    // 唔該 (traditional) vs 唔该 (transcript already simplified by ASR)
    expect(containsAny(n('唔该嚟一籠'), ['唔該'])).toBe(true);
    expect(containsAny(n('你好'), ['唔該'])).toBe(false);
  });
});

describe('polite', () => {
  it('detects 唔該 / 嚟 / 俾', () => {
    expect(hasPolite(n('唔該嚟一籠蝦餃'))).toBe(true);
    expect(hasPolite(n('俾我一個'))).toBe(true);
    expect(hasPolite(n('蝦餃'))).toBe(false);
  });
});

describe('quantity (number + measure)', () => {
  it('requires both a number and a measure word', () => {
    expect(hasNumber(n('一籠'))).toBe(true);
    expect(hasMeasure(n('一籠'))).toBe(true);
    expect(hasQuantity(n('一籠蝦餃'))).toBe(true);
    expect(hasQuantity(n('兩個叉燒包'))).toBe(true); // 兩→两
    expect(hasQuantity(n('蝦餃'))).toBe(false);       // no number, no measure
    expect(hasQuantity(n('我要蝦餃'))).toBe(false);
  });
});

describe('price', () => {
  it('detects 幾錢 / 幾多錢 / 點賣', () => {
    expect(hasPrice(n('糯米雞幾錢呀'))).toBe(true);
    expect(hasPrice(n('點賣呀'))).toBe(true);
    expect(hasPrice(n('一個糯米雞'))).toBe(false);
  });
});

describe('checkout', () => {
  it('detects 埋單 / 結賬 / 睇數', () => {
    expect(hasCheckout(n('唔該埋單'))).toBe(true);
    expect(hasCheckout(n('結賬'))).toBe(true);
    expect(hasCheckout(n('一碗艇仔粥'))).toBe(false);
  });
});
