import { similarityRatio } from './levenshtein';
import { normalizeForCompare } from './normalize';

export function calculateTextSimilarity(text1: string, text2: string): number {
  return similarityRatio(normalizeForCompare(text1), normalizeForCompare(text2));
}
