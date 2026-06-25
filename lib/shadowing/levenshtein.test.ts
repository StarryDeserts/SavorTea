import { describe, it, expect } from 'vitest';
import { levenshtein, similarityRatio } from '@/lib/shadowing/levenshtein';

describe('levenshtein', () => {
  it('is 0 for identical strings', () => {
    expect(levenshtein('蝦餃', '蝦餃')).toBe(0);
  });
  it('counts single-character edits', () => {
    expect(levenshtein('蝦餃', '蝦餃包')).toBe(1);
    expect(levenshtein('abc', 'axc')).toBe(1);
  });
  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('similarityRatio', () => {
  it('is 100 for identical strings', () => {
    expect(similarityRatio('蝦餃', '蝦餃')).toBe(100);
  });
  it('is 100 for two empty strings', () => {
    expect(similarityRatio('', '')).toBe(100);
  });
  it('is between 0 and 100 for partial matches', () => {
    const r = similarityRatio('唔該嚟一籠蝦餃', '嚟一籠蝦餃');
    expect(r).toBeGreaterThan(50);
    expect(r).toBeLessThan(100);
  });
});
