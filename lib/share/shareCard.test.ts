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

/**
 * Build a minimal 2D context mock that records every `fillText` call and
 * stubs the path/gradient/transform APIs the new drawing uses, so the
 * test doesn't blow up on `createLinearGradient is not a function` etc.
 */
function makeCtxMock() {
  const fillTexts: string[] = [];
  const fakeGradient = { addColorStop: vi.fn() };
  const ctx = {
    // mutable state the drawing sets
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 1,
    lineCap: 'butt',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    // recorded
    fillText: vi.fn((text: string) => fillTexts.push(text)),
    // drawing primitives — no-ops, just need to exist
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    createLinearGradient: vi.fn(() => fakeGradient),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, fillTexts };
}

describe('drawShareCard', () => {
  it('renders the title, the date, every cleared dish name, and the score line', () => {
    const { ctx, fillTexts } = makeCtxMock();

    drawShareCard(ctx, {
      date: '2026-06-25',
      dishes: [
        { nameYue: '蝦餃', emoji: '🦐' },
        { nameYue: '蛋撻', emoji: '🥧' },
        { nameYue: '燒賣', emoji: '🥟' },
      ],
      clearedCount: 3,
      totalStars: 7,
    });

    const joined = fillTexts.join('|');
    // Title — drawn character-spaced; assert the chars are present in order.
    expect(joined).toMatch(/今.*日.*飲.*茶/);
    // Date.
    expect(joined).toContain('2026-06-25');
    // Each cleared dish's 粵文 name reached fillText.
    expect(joined).toContain('蝦餃');
    expect(joined).toContain('蛋撻');
    expect(joined).toContain('燒賣');
    // Score line uses cleared count and summed stars.
    expect(joined).toContain('叹咗 3 道');
    expect(joined).toContain('7 粒星');
    // Background fill happened.
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('caps the dish grid at 10 entries (5 rows × 2 cols)', () => {
    const { ctx, fillTexts } = makeCtxMock();
    const many = Array.from({ length: 12 }, (_, i) => ({
      nameYue: `菜${i + 1}`,
      emoji: '•',
    }));
    drawShareCard(ctx, { date: '2026-06-25', dishes: many, clearedCount: 12, totalStars: 30 });
    // First 10 names rendered, the 11th/12th cropped.
    for (let i = 1; i <= 10; i++) expect(fillTexts).toContain(`菜${i}`);
    expect(fillTexts).not.toContain('菜11');
    expect(fillTexts).not.toContain('菜12');
  });
});
