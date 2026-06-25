import { describe, it, expect, vi } from 'vitest';
import { buildShareCardData, drawShareCard } from '@/lib/share/shareCard';
import { DISHES } from '@/lib/dishes/data';

describe('buildShareCardData', () => {
  it('maps ordered ids to dish name+emoji and formats the date', () => {
    const data = buildShareCardData({
      dishes: DISHES,
      orderedDishIds: ['har-gow', 'daan-taat'],
      bestScore: 88,
      date: new Date('2026-06-25T10:00:00Z'),
    });
    expect(data.date).toBe('2026-06-25');
    expect(data.dishes).toEqual([
      { nameYue: '蝦餃', emoji: '🦐' },
      { nameYue: '蛋撻', emoji: '🥧' },
    ]);
    expect(data.bestScore).toBe(88);
  });

  it('skips unknown ids', () => {
    const data = buildShareCardData({ dishes: DISHES, orderedDishIds: ['nope'], bestScore: 0 });
    expect(data.dishes).toEqual([]);
  });

  it('uses the Hong Kong calendar day, not UTC (no early-morning off-by-one)', () => {
    // 2026-06-24T18:00Z is 2026-06-25 02:00 in Hong Kong (UTC+8).
    // Naive UTC slicing would wrongly show 2026-06-24.
    const data = buildShareCardData({
      dishes: DISHES,
      orderedDishIds: [],
      bestScore: 0,
      date: new Date('2026-06-24T18:00:00Z'),
    });
    expect(data.date).toBe('2026-06-25');
  });
});

describe('drawShareCard', () => {
  it('renders the title, date, each dish, and the score', () => {
    const calls: string[] = [];
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn((text: string) => calls.push(text)),
    } as unknown as CanvasRenderingContext2D;

    drawShareCard(ctx, { date: '2026-06-25', dishes: [{ nameYue: '蝦餃', emoji: '🦐' }], bestScore: 88 });

    const joined = calls.join('|');
    expect(joined).toContain('今日飲茶');
    expect(joined).toContain('2026-06-25');
    expect(joined).toContain('蝦餃');
    expect(joined).toContain('88');
  });
});
