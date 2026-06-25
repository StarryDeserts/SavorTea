import * as OpenCC from 'opencc-js';

const toSimplified = OpenCC.Converter({ from: 't', to: 'cn' });

export function normalizeForCompare(text: string): string {
  const simplified = toSimplified(text ?? '');
  // remove all whitespace and punctuation (keep letters/numbers/CJK)
  return simplified.replace(/[\s\p{P}\p{S}]/gu, '');
}
