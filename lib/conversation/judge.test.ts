import { describe, it, expect } from 'vitest';
import { parseJudgeContent, buildJudgeFallback } from '@/lib/conversation/judge';
import { FALLBACK_LINES } from '@/lib/conversation/persona';
import { DISHES } from '@/lib/dishes/data';

describe('parseJudgeContent', () => {
  it('parses a well-formed JSON judge payload', () => {
    const r = parseJudgeContent('{"reply":"好嘞!蝦餃即刻嚟。","stars":3,"tip":"講得好地道"}');
    expect(r).toEqual({ reply: '好嘞!蝦餃即刻嚟。', stars: 3, tip: '講得好地道' });
  });
  it('clamps stars into 1..3 and floors to integer', () => {
    expect(parseJudgeContent('{"reply":"x","stars":9,"tip":"y"}')?.stars).toBe(3);
    expect(parseJudgeContent('{"reply":"x","stars":0,"tip":"y"}')?.stars).toBe(1);
    expect(parseJudgeContent('{"reply":"x","stars":2.7,"tip":"y"}')?.stars).toBe(2);
  });
  it('returns null on invalid JSON or missing fields', () => {
    expect(parseJudgeContent('not json')).toBeNull();
    expect(parseJudgeContent('{"reply":"x"}')).toBeNull();
    expect(parseJudgeContent('{"reply":1,"stars":2,"tip":"y"}')).toBeNull();
  });
});

describe('buildJudgeFallback', () => {
  it('uses a persona fallback line, default stars, and the dish hint', () => {
    const d = DISHES[0];
    const pass = buildJudgeFallback(d, true);
    expect(FALLBACK_LINES).toContain(pass.reply);
    expect(pass.stars).toBe(2);
    expect(pass.tip).toBe(d.task.hint);
    expect(buildJudgeFallback(d, false).stars).toBe(0);
  });
});
