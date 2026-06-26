import { describe, it, expect, vi } from 'vitest';
import { buildShareCardData, drawShareCard } from '@/lib/share/shareCard';
import { DISHES } from '@/lib/dishes/data';

describe('buildShareCardData', () => {
  it('maps cleared ids to name+emoji, counts clears, sums stars, formats the date', () => {
    const data = buildShareCardData({
      dishes: DISHES,
      clearedDishIds: ['har-gow', 'daan-taat'],
      stars: { 'har-gow': 3, 'daan-taat': 2 },
      date: new Date('2026-06-25T10:00:00Z'),
    });
    expect(data.date).toBe('2026-06-25');
    expect(data.dishes).toEqual([
      { nameYue: '蝦餃', emoji: '🦐' },
      { nameYue: '蛋撻', emoji: '🥧' },
    ]);
    expect(data.clearedCount).toBe(2);
    expect(data.totalStars).toBe(5);
  });

  it('skips unknown ids and sums only the stars provided', () => {
    const data = buildShareCardData({ dishes: DISHES, clearedDishIds: ['nope'], stars: {} });
    expect(data.dishes).toEqual([]);
    expect(data.clearedCount).toBe(0);
    expect(data.totalStars).toBe(0);
  });

  it('uses the Hong Kong calendar day, not UTC (no early-morning off-by-one)', () => {
    // 2026-06-24T18:00Z is 2026-06-25 02:00 in Hong Kong (UTC+8).
    // Naive UTC slicing would wrongly show 2026-06-24.
    const data = buildShareCardData({
      dishes: DISHES,
      clearedDishIds: [],
      stars: {},
      date: new Date('2026-06-24T18:00:00Z'),
    });
    expect(data.date).toBe('2026-06-25');
  });
});

describe('drawShareCard', () => {
  it('renders the title, date, each dish, and the clears+stars line', () => {
    const calls: string[] = [];
    const ctx = {
      fillStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn((text: string) => calls.push(text)),
    } as unknown as CanvasRenderingContext2D;

    drawShareCard(ctx, {
      date: '2026-06-25',
      dishes: [{ nameYue: '蝦餃', emoji: '🦐' }],
      clearedCount: 1,
      totalStars: 3,
    });

    const joined = calls.join('|');
    expect(joined).toContain('今日飲茶');
    expect(joined).toContain('2026-06-25');
    expect(joined).toContain('蝦餃');
    expect(joined).toContain('叹咗 1 道');
    expect(joined).toContain('3 粒星');
  });
});
