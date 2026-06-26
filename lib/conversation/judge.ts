import type { Dish } from '@/lib/dishes/types';
import { FALLBACK_LINES } from './persona';

export interface JudgeResult {
  reply: string;
  stars: number;
  tip: string;
}

export function parseJudgeContent(raw: string): JudgeResult | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { reply, stars, tip } = data as Record<string, unknown>;
  if (typeof reply !== 'string' || typeof tip !== 'string' || typeof stars !== 'number') {
    return null;
  }
  const clamped = Math.min(3, Math.max(1, Math.floor(stars)));
  return { reply, stars: clamped, tip };
}

export function buildJudgeFallback(dish: Dish, pass: boolean): JudgeResult {
  const reply = FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
  return { reply, stars: pass ? 2 : 0, tip: dish.task.hint };
}
