import { describe, it, expect } from 'vitest';
import { buildDishContext, buildSystemPrompt } from '@/lib/conversation/prompt';
import { PERSONA_NAME } from '@/lib/conversation/persona';
import { DISHES } from '@/lib/dishes/data';

describe('buildDishContext', () => {
  it('lists every dish name and its cultural note', () => {
    const ctx = buildDishContext(DISHES);
    for (const d of DISHES) {
      expect(ctx).toContain(d.nameYue);
      expect(ctx).toContain(d.culturalNote);
    }
  });
});

describe('buildSystemPrompt', () => {
  it('names the persona and enforces 粤文', () => {
    const prompt = buildSystemPrompt(DISHES);
    expect(prompt).toContain(PERSONA_NAME);
    expect(prompt).toContain('粵文'); // explicit 粤文 instruction
    expect(prompt).toContain('唔可以'); // negative-rule marker (must be Cantonese, not Mandarin)
  });
  it('injects the real dish menu so the model cannot invent dishes', () => {
    const prompt = buildSystemPrompt(DISHES);
    expect(prompt).toContain('蝦餃');
    expect(prompt).toContain('艇仔粥');
  });
});
