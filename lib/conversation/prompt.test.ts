import { describe, it, expect } from 'vitest';
import { buildDishContext, buildSystemPrompt, buildJudgePrompt } from '@/lib/conversation/prompt';
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

describe('buildJudgePrompt', () => {
  it('injects goal, transcript, verdict, persona, and asks for JSON', () => {
    const d = DISHES[0];
    const prompt = buildJudgePrompt(d, '唔該嚟一籠蝦餃', true);
    expect(prompt).toContain(PERSONA_NAME);
    expect(prompt).toContain(d.task.goal);
    expect(prompt).toContain('唔該嚟一籠蝦餃');
    expect(prompt).toContain('JSON');     // required for json_object mode
    expect(prompt).toContain('reply');
    expect(prompt).toContain('stars');
    expect(prompt).toContain('tip');
  });
  it('reflects the pass verdict in the prompt', () => {
    const d = DISHES[0];
    expect(buildJudgePrompt(d, 'x', true)).toContain('已經');
    expect(buildJudgePrompt(d, 'x', false)).toContain('仲未');
  });
});
