import { describe, it, expect } from 'vitest';
import { normalizeForCompare } from '@/lib/shadowing/normalize';
import { calculateTextSimilarity } from '@/lib/shadowing/textSimilarity';

describe('normalizeForCompare', () => {
  it('strips punctuation and whitespace', () => {
    expect(normalizeForCompare('唔該, 嚟一籠!')).toBe(normalizeForCompare('唔該嚟一籠'));
  });
  it('converts traditional to simplified so they compare equal', () => {
    expect(normalizeForCompare('蝦餃')).toBe(normalizeForCompare('虾饺'));
  });
});

describe('calculateTextSimilarity', () => {
  it('scores identical phrases 100', () => {
    expect(calculateTextSimilarity('唔該嚟一籠蝦餃', '唔該嚟一籠蝦餃')).toBe(100);
  });
  it('ignores punctuation differences', () => {
    expect(calculateTextSimilarity('唔該,嚟一籠蝦餃。', '唔該嚟一籠蝦餃')).toBe(100);
  });
  it('scores traditional vs simplified of the same phrase 100', () => {
    expect(calculateTextSimilarity('蝦餃', '虾饺')).toBe(100);
  });
});
