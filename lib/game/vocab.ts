import { normalizeForCompare } from '@/lib/shadowing/normalize';

export const POLITE_WORDS = ['唔該', '嚟', '俾'];
export const NUMBER_WORDS = ['一', '二', '兩', '三', '四', '五', '六', '七', '八', '九', '十', '半'];
export const MEASURE_WORDS = ['個', '籠', '碟', '碗', '件', '條', '份', '客', '樽', '煲'];
export const PRICE_WORDS = ['幾錢', '幾多錢', '點賣', '幾多'];
export const CHECKOUT_WORDS = ['埋單', '結賬', '睇數'];

// `text` MUST already be normalized via normalizeForCompare.
export function containsAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(normalizeForCompare(w)));
}

export function hasPolite(t: string): boolean {
  return containsAny(t, POLITE_WORDS);
}
export function hasNumber(t: string): boolean {
  return containsAny(t, NUMBER_WORDS);
}
export function hasMeasure(t: string): boolean {
  return containsAny(t, MEASURE_WORDS);
}
export function hasQuantity(t: string): boolean {
  return hasNumber(t) && hasMeasure(t);
}
export function hasPrice(t: string): boolean {
  return containsAny(t, PRICE_WORDS);
}
export function hasCheckout(t: string): boolean {
  return containsAny(t, CHECKOUT_WORDS);
}
