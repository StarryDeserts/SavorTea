# 叹茶·虚拟茶楼 v2「点单闯关」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 "text-chat + controlled phrase-shadowing" loop with a voice-driven free-ordering quest game where a deterministic checker authoritatively decides pass/fail and DeepSeek supplies 點心姨's in-character line, 地道 stars, and a hint.

**Architecture:** Each dish becomes a level carrying a `task` (goal/skills/hint). A player's transcript (DimSum ASR for voice, text for fallback) flows through two parallel judges: a pure client-side `checkOrder(transcript, dish)` that returns `{pass, hit}` and is the sole authority on passing, and a server-proxied DeepSeek call returning `{reply, stars, tip}` that is flavor only. The store tracks `clearedDishIds`/`stars`/`currentLevel`; clearing all 10 unlocks the 「今日飲茶」share card.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript, Zustand 5 + persist, Vitest 4 + @testing-library/react (jsdom), opencc-js (traditional→simplified normalization), DeepSeek (`deepseek-chat`, server-only), DimSum ASR (`transcribeAudioBlob`).

## Global Constraints

- **DeepSeek key is server-only.** `DEEPSEEK_API_KEY` / `DEEPSEEK_API_BASE_URL` appear ONLY in `lib/conversation/deepseek.ts` (`import 'server-only'`) and `app/api/chat/route.ts`. Never imported by a client component, never logged, never in a response body. Every route test asserts `expect(JSON.stringify(body)).not.toContain('test-secret-key')`.
- **Stable semantic class / prop names — never write final visual CSS.** Components expose only the semantic classes / `data-` attrs listed in the design §9 and `docs/INTEGRATION.md`. open-design owns all final CSS. Do NOT rename props or classes, do NOT add visual styling beyond what already exists in `app/globals.css`.
- **Single source for dishes:** adding/altering a dish touches ONLY `lib/dishes/data.ts`. Level/task data lives on `Dish.task`, judging logic in `lib/game/`.
- **Cantonese only in product copy / character lines** (粵文書寫: 係/唔/嘅/咗/喺/嚟/俾). Technical identifiers stay English. Never use 書面中文 (的/了/是/我們) in 點心姨 lines or goals/hints.
- **Game never hard-breaks.** ASR failure, model failure, or parse failure must degrade to a fallback line + default stars (`pass ? 2 : 0`) + the dish's hint — passing is decided by the offline checker, so the game is playable 断网/拒麦.
- **Persist key stays `tan-cha-store`.** The store shape changes; bump persist `version` and migrate old data to fresh defaults (no account/cloud — reset is acceptable).
- **Test runner:** `npm test` (`vitest run`). Globals enabled (`describe/it/expect/vi` ambient). Route tests use `vi.stubEnv` + dynamic `import('@/app/api/chat/route')`. `server-only` is aliased to an empty stub in `vitest.config.ts`.

---

## File Structure

**New files:**
- `lib/game/vocab.ts` — word tables (polite/number/measure/price/checkout) + normalize-aware matchers.
- `lib/game/vocab.test.ts`
- `lib/game/checker.ts` — `checkOrder(transcript, dish)` + name-hit helpers.
- `lib/game/checker.test.ts`
- `lib/conversation/judge.ts` — `JudgeResult` type, `parseJudgeContent`, `buildJudgeFallback` (pure; shared by route + client).
- `lib/conversation/judge.test.ts`
- `components/VoiceOrderButton.tsx` — record → ASR → `onTranscript(transcript)`.
- `components/VoiceOrderButton.test.tsx`

**Modified files:**
- `lib/dishes/types.ts` — add `OrderSkill`, `DishTask`, `task` on `Dish`.
- `lib/dishes/data.ts` — add `task` to all 10 dishes.
- `lib/dishes/data.test.ts` — assert task shape.
- `lib/conversation/prompt.ts` — add `buildJudgePrompt(dish, transcript, pass)`.
- `lib/conversation/prompt.test.ts` — judge-prompt tests.
- `lib/conversation/deepseek.ts` — optional `{ jsonMode }` → `response_format: { type: 'json_object' }`.
- `app/api/chat/route.ts` — new body `{dishId, transcript, pass}`; parse `{reply,stars,tip}`; fallback.
- `app/api/chat/route.test.ts` — rewrite for judge contract.
- `lib/conversation/engine.ts` — replace `sendChat`/`detectOrderedDishes` with `judgeOrder`.
- `lib/conversation/engine.test.ts` — rewrite for `judgeOrder`.
- `lib/store/teahouseStore.ts` — `clearedDishIds`/`stars`/`currentLevel` + `clearLevel` + migrate.
- `lib/store/teahouseStore.test.ts` — rewrite for new shape.
- `components/OrderChat.tsx` — quest orchestration UI.
- `components/OrderChat.test.tsx` — quest UI tests.
- `lib/share/shareCard.ts` — `buildShareCardData({dishes, clearedDishIds, stars})`.
- `lib/share/shareCard.test.ts` — total-stars/count tests.
- `components/ShareCardButton.tsx` — read `clearedDishIds`/`stars`.
- `app/page.tsx` — quest flow wiring.
- `docs/INTEGRATION.md` — new classes/props + data flow + manual checklist.

`components/ShadowingButton.tsx` and `components/StampBook.tsx` are **unchanged** (ShadowingButton is reused as the optional 跟讀 practice inside OrderChat's hint scaffold; StampBook keeps its `stampedDishIds` prop name and is fed `clearedDishIds` by the page).

---

### Task 1: Vocab word tables + matchers

**Files:**
- Create: `lib/game/vocab.ts`
- Test: `lib/game/vocab.test.ts`

**Interfaces:**
- Consumes: `normalizeForCompare` from `lib/shadowing/normalize.ts` (traditional→simplified, strips whitespace/punctuation).
- Produces: `containsAny(normalizedText: string, words: string[]): boolean`; `hasPolite(t)`, `hasNumber(t)`, `hasMeasure(t)`, `hasQuantity(t)`, `hasPrice(t)`, `hasCheckout(t)` — each takes an ALREADY-normalized string and returns `boolean`. Exported const arrays `POLITE_WORDS`, `NUMBER_WORDS`, `MEASURE_WORDS`, `PRICE_WORDS`, `CHECKOUT_WORDS` (traditional source forms).

- [ ] **Step 1: Write the failing test**

```ts
// lib/game/vocab.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeForCompare } from '@/lib/shadowing/normalize';
import {
  containsAny,
  hasPolite,
  hasNumber,
  hasMeasure,
  hasQuantity,
  hasPrice,
  hasCheckout,
} from '@/lib/game/vocab';

const n = normalizeForCompare;

describe('containsAny', () => {
  it('matches across traditional/simplified by normalizing both sides', () => {
    // 唔該 (traditional) vs 唔该 (transcript already simplified by ASR)
    expect(containsAny(n('唔该嚟一籠'), ['唔該'])).toBe(true);
    expect(containsAny(n('你好'), ['唔該'])).toBe(false);
  });
});

describe('polite', () => {
  it('detects 唔該 / 嚟 / 俾', () => {
    expect(hasPolite(n('唔該嚟一籠蝦餃'))).toBe(true);
    expect(hasPolite(n('俾我一個'))).toBe(true);
    expect(hasPolite(n('蝦餃'))).toBe(false);
  });
});

describe('quantity (number + measure)', () => {
  it('requires both a number and a measure word', () => {
    expect(hasNumber(n('一籠'))).toBe(true);
    expect(hasMeasure(n('一籠'))).toBe(true);
    expect(hasQuantity(n('一籠蝦餃'))).toBe(true);
    expect(hasQuantity(n('兩個叉燒包'))).toBe(true); // 兩→两
    expect(hasQuantity(n('蝦餃'))).toBe(false);       // no number, no measure
    expect(hasQuantity(n('我要蝦餃'))).toBe(false);
  });
});

describe('price', () => {
  it('detects 幾錢 / 幾多錢 / 點賣', () => {
    expect(hasPrice(n('糯米雞幾錢呀'))).toBe(true);
    expect(hasPrice(n('點賣呀'))).toBe(true);
    expect(hasPrice(n('一個糯米雞'))).toBe(false);
  });
});

describe('checkout', () => {
  it('detects 埋單 / 結賬 / 睇數', () => {
    expect(hasCheckout(n('唔該埋單'))).toBe(true);
    expect(hasCheckout(n('結賬'))).toBe(true);
    expect(hasCheckout(n('一碗艇仔粥'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/game/vocab.test.ts`
Expected: FAIL — "Cannot find module '@/lib/game/vocab'".

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/game/vocab.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/game/vocab.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/game/vocab.ts lib/game/vocab.test.ts
git commit -m "feat: add order-vocab word tables and normalize-aware matchers"
```

---

### Task 2: Dish task data model (types + data)

**Files:**
- Modify: `lib/dishes/types.ts`
- Modify: `lib/dishes/data.ts`
- Test: `lib/dishes/data.test.ts`

**Interfaces:**
- Produces: `OrderSkill = 'name'|'polite'|'quantity'|'modifier'|'alias'|'price'|'multi'|'checkout'`; `DishTask { level: number; skills: OrderSkill[]; goal: string; hint: string; aliases?: string[]; modifiers?: string[] }`; `Dish` gains required `task: DishTask`. All 10 `DISHES` carry a `task` whose `hint` satisfies its own `requires` (verified in Task 3).

- [ ] **Step 1: Write the failing test** (append to `lib/dishes/data.test.ts`)

```ts
// add inside lib/dishes/data.test.ts
import type { OrderSkill } from '@/lib/dishes/types';

const ALL_SKILLS: OrderSkill[] = ['name', 'polite', 'quantity', 'modifier', 'alias', 'price', 'multi', 'checkout'];

describe('DISHES tasks', () => {
  it('every dish has a task with level 1..10 in menu order and a non-empty goal/hint', () => {
    DISHES.forEach((d, i) => {
      expect(d.task, d.id).toBeTruthy();
      expect(d.task.level, d.id).toBe(i + 1);
      expect(d.task.goal, d.id).toBeTruthy();
      expect(d.task.hint, d.id).toBeTruthy();
      expect(d.task.skills.length, d.id).toBeGreaterThan(0);
      d.task.skills.forEach((s) => expect(ALL_SKILLS).toContain(s));
    });
  });

  it('skills imply their config: alias level has aliases, modifier level has modifiers', () => {
    for (const d of DISHES) {
      if (d.task.skills.includes('alias')) expect(d.task.aliases?.length, d.id).toBeGreaterThan(0);
      if (d.task.skills.includes('modifier')) expect(d.task.modifiers?.length, d.id).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/dishes/data.test.ts`
Expected: FAIL — `Property 'task' does not exist` (type) and/or `d.task` undefined.

- [ ] **Step 3a: Extend the types**

```ts
// lib/dishes/types.ts — append after the Dish interface, and add `task` to Dish
export type OrderSkill =
  | 'name' | 'polite' | 'quantity' | 'modifier'
  | 'alias' | 'price' | 'multi' | 'checkout';

export interface DishTask {
  level: number;        // 1..10, menu order
  skills: OrderSkill[]; // this level's requires
  goal: string;         // 點心姨's goal line (粵文)
  hint: string;         // demo phrase (echoing it must pass this level)
  aliases?: string[];   // for the `alias` skill, e.g. ['蝦腸','蝦腸粉']
  modifiers?: string[]; // for the `modifier` skill, e.g. ['熱','趁熱']
}
```

Then change the `Dish` interface to add the field (keep all existing fields):

```ts
export interface Dish {
  id: string;
  nameYue: string;
  jyutping: string;
  namePutonghua: string;
  nameEn: string;
  category: DishCategory;
  emoji: string;
  culturalNote: string;
  orderPhrase: string;
  orderPhraseJyutping: string;
  corpusUuid?: string;
  task: DishTask;
}
```

- [ ] **Step 3b: Add `task` to every dish in `lib/dishes/data.ts`**

Insert a `task` object into each of the 10 dish literals (after `orderPhraseJyutping`). Exact values:

```ts
// har-gow
task: { level: 1, skills: ['name', 'polite'], goal: '用粵語唔該姨嚟一籠蝦餃。', hint: '唔該嚟一籠蝦餃' },
// siu-mai
task: { level: 2, skills: ['name', 'polite', 'quantity'], goal: '今次連埋數量,一籠燒賣噉嗌。', hint: '嚟一籠燒賣' },
// char-siu-bao
task: { level: 3, skills: ['name', 'quantity'], goal: '嗌兩個叉燒包,記得講清楚幾多個。', hint: '我要兩個叉燒包' },
// fung-zaau
task: { level: 4, skills: ['name', 'quantity', 'modifier'], goal: '試下要一碟豉汁鳳爪。', hint: '一碟豉汁鳳爪', modifiers: ['豉汁'] },
// cheung-fan
task: { level: 5, skills: ['name', 'polite'], goal: '老廣叫蝦腸,你噉嗌睇下姨聽唔聽得明。', hint: '唔該嚟條蝦腸', aliases: ['蝦腸', '蝦腸粉'] },
// daan-taat
task: { level: 6, skills: ['name', 'quantity', 'polite'], goal: '兩個蛋撻唔該——禮貌放後面都得。', hint: '兩個蛋撻唔該' },
// no-mai-gai
task: { level: 7, skills: ['name', 'price'], goal: '問下糯米雞幾錢,再嗌一個。', hint: '糯米雞幾錢?嚟一個糯米雞' },
// lau-sa-bao
task: { level: 8, skills: ['name', 'modifier'], goal: '嗌流沙包,話俾姨知要熱辣辣即蒸。', hint: '嚟籠流沙包,要熱辣辣', modifiers: ['熱', '趁熱', '熱辣辣'] },
// maa-laai-gou
task: { level: 9, skills: ['name', 'multi'], goal: '切件馬拉糕,順便再搭多一樣你鍾意嘅。', hint: '切件馬拉糕,再嚟一籠蝦餃' },
// teng-zai-zuk
task: { level: 10, skills: ['name', 'checkout'], goal: '最後一碗艇仔粥,食飽用粵語同姨埋單。', hint: '一碗艇仔粥,唔該埋單' },
```

Note for level 5: `aliases` includes 蝦腸; the checker treats an alias hit as also satisfying `name` (Task 3), so skills stay `['name','polite']`. The hint `唔該嚟條蝦腸` carries 唔該/嚟 (polite) + 蝦腸 (alias→name).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/dishes/data.test.ts`
Expected: PASS. Also run `npx tsc --noEmit` and expect no errors (every Dish now has `task`).

- [ ] **Step 5: Commit**

```bash
git add lib/dishes/types.ts lib/dishes/data.ts lib/dishes/data.test.ts
git commit -m "feat: add per-dish task/level data model for ordering quest"
```

---

### Task 3: Deterministic order checker

**Files:**
- Create: `lib/game/checker.ts`
- Test: `lib/game/checker.test.ts`

**Interfaces:**
- Consumes: `normalizeForCompare` (normalize.ts); `hasPolite/hasQuantity/hasPrice/hasCheckout` + `containsAny` (vocab.ts, Task 1); `Dish`/`OrderSkill`/`DishTask` (types, Task 2); `DISHES` (data.ts) for `multi` counting.
- Produces: `hitsDishName(normalizedText: string, dish: Dish): boolean` (name OR putonghua OR alias, all normalized); `countDistinctDishNames(normalizedText: string, dishes: Dish[]): number`; `checkOrder(transcript: string, dish: Dish): { pass: boolean; hit: Record<OrderSkill, boolean> }`. `pass` is true iff every skill in `dish.task.skills` is hit. This is the SOLE authority on passing a level.

- [ ] **Step 1: Write the failing test**

```ts
// lib/game/checker.test.ts
import { describe, it, expect } from 'vitest';
import { checkOrder } from '@/lib/game/checker';
import { DISHES } from '@/lib/dishes/data';

const byId = (id: string) => DISHES.find((d) => d.id === id)!;

describe('checkOrder per skill', () => {
  it('level 1 (name+polite): passes only with both', () => {
    const d = byId('har-gow');
    expect(checkOrder('唔該嚟一籠蝦餃', d).pass).toBe(true);
    expect(checkOrder('蝦餃', d).pass).toBe(false);     // no polite
    expect(checkOrder('唔該嚟一籠', d).pass).toBe(false); // no name
  });

  it('matches a dish name even when ASR returns simplified', () => {
    const d = byId('har-gow');
    // 虾饺 is the simplified putonghua form; 唔该 simplified polite
    expect(checkOrder('唔该嚟一籠虾饺', d).pass).toBe(true);
  });

  it('level 3 (name+quantity): needs a number and a measure', () => {
    const d = byId('char-siu-bao');
    expect(checkOrder('我要兩個叉燒包', d).pass).toBe(true);
    expect(checkOrder('我要叉燒包', d).pass).toBe(false); // no quantity
  });

  it('level 4 (modifier 豉汁)', () => {
    const d = byId('fung-zaau');
    expect(checkOrder('一碟豉汁鳳爪', d).pass).toBe(true);
    expect(checkOrder('一碟鳳爪', d).pass).toBe(false); // missing modifier
  });

  it('level 5 (alias 蝦腸 satisfies name)', () => {
    const d = byId('cheung-fan');
    expect(checkOrder('唔該嚟條蝦腸', d).pass).toBe(true);
    expect(checkOrder('蝦腸', d).pass).toBe(false); // no polite
  });

  it('level 7 (price): needs a price question', () => {
    const d = byId('no-mai-gai');
    expect(checkOrder('糯米雞幾錢', d).pass).toBe(true);
    expect(checkOrder('一個糯米雞', d).pass).toBe(false);
  });

  it('level 9 (multi): needs two distinct dish names', () => {
    const d = byId('maa-laai-gou');
    expect(checkOrder('切件馬拉糕,再嚟一籠蝦餃', d).pass).toBe(true);
    expect(checkOrder('切件馬拉糕', d).pass).toBe(false); // only one dish
  });

  it('level 10 (checkout)', () => {
    const d = byId('teng-zai-zuk');
    expect(checkOrder('一碗艇仔粥,唔該埋單', d).pass).toBe(true);
    expect(checkOrder('一碗艇仔粥', d).pass).toBe(false);
  });

  it('reports per-skill hit map', () => {
    const d = byId('har-gow');
    const { hit } = checkOrder('蝦餃', d);
    expect(hit.name).toBe(true);
    expect(hit.polite).toBe(false);
  });
});

describe('every dish hint passes its own level', () => {
  it('echoing task.hint clears the level', () => {
    for (const d of DISHES) {
      expect(checkOrder(d.task.hint, d).pass, d.id).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/game/checker.test.ts`
Expected: FAIL — "Cannot find module '@/lib/game/checker'".

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/game/checker.ts
import type { Dish, OrderSkill } from '@/lib/dishes/types';
import { DISHES } from '@/lib/dishes/data';
import { normalizeForCompare } from '@/lib/shadowing/normalize';
import { containsAny, hasPolite, hasQuantity, hasPrice, hasCheckout } from './vocab';

// `normalizedText` MUST already be normalized.
export function hitsDishName(normalizedText: string, dish: Dish): boolean {
  const names = [dish.nameYue, dish.namePutonghua, ...(dish.task.aliases ?? [])];
  return containsAny(normalizedText, names);
}

export function countDistinctDishNames(normalizedText: string, dishes: Dish[]): number {
  return dishes.filter((d) => hitsDishName(normalizedText, d)).length;
}

function checkSkill(skill: OrderSkill, t: string, dish: Dish): boolean {
  switch (skill) {
    case 'name':
    case 'alias':
      return hitsDishName(t, dish);
    case 'polite':
      return hasPolite(t);
    case 'quantity':
      return hasQuantity(t);
    case 'modifier':
      return containsAny(t, dish.task.modifiers ?? []);
    case 'price':
      return hasPrice(t);
    case 'checkout':
      return hasCheckout(t);
    case 'multi':
      return countDistinctDishNames(t, DISHES) >= 2;
  }
}

export function checkOrder(
  transcript: string,
  dish: Dish,
): { pass: boolean; hit: Record<OrderSkill, boolean> } {
  const t = normalizeForCompare(transcript);
  const hit = {
    name: false, polite: false, quantity: false, modifier: false,
    alias: false, price: false, multi: false, checkout: false,
  } as Record<OrderSkill, boolean>;
  for (const skill of dish.task.skills) hit[skill] = checkSkill(skill, t, dish);
  const pass = dish.task.skills.every((s) => hit[s]);
  return { pass, hit };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/game/checker.test.ts`
Expected: PASS (including the "every hint passes its own level" cross-check across all 10 dishes).

- [ ] **Step 5: Commit**

```bash
git add lib/game/checker.ts lib/game/checker.test.ts
git commit -m "feat: add deterministic order checker as the authoritative pass gate"
```

---

### Task 4: Store refactor (cleared/stars/currentLevel)

**Files:**
- Modify: `lib/store/teahouseStore.ts`
- Test: `lib/store/teahouseStore.test.ts` (rewrite)

**Interfaces:**
- Consumes: `ChatMessage` from `lib/conversation/types.ts`.
- Produces: `TeahouseState { messages: ChatMessage[]; clearedDishIds: string[]; stars: Record<string, number>; currentLevel: number; addMessage(m): void; clearLevel(id: string, stars: number): void; reset(): void }`. `clearLevel` dedupes `clearedDishIds`, keeps the max stars per dish, and sets `currentLevel = clearedDishIds.length + 1`. Initial `currentLevel = 1`. Persist name stays `tan-cha-store`, `version: 1`, with a `migrate` that discards any older shape.

- [ ] **Step 1: Rewrite the test**

```ts
// lib/store/teahouseStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useTeahouseStore } from '@/lib/store/teahouseStore';

beforeEach(() => {
  useTeahouseStore.getState().reset();
  localStorage.clear();
});

describe('useTeahouseStore', () => {
  it('appends messages', () => {
    useTeahouseStore.getState().addMessage({ role: 'user', content: '嚟蝦餃' });
    expect(useTeahouseStore.getState().messages).toHaveLength(1);
  });

  it('starts at level 1', () => {
    expect(useTeahouseStore.getState().currentLevel).toBe(1);
  });

  it('clearLevel records the dish, sets stars, and advances currentLevel', () => {
    useTeahouseStore.getState().clearLevel('har-gow', 3);
    const s = useTeahouseStore.getState();
    expect(s.clearedDishIds).toEqual(['har-gow']);
    expect(s.stars['har-gow']).toBe(3);
    expect(s.currentLevel).toBe(2);
  });

  it('clearLevel dedupes ids and keeps the highest stars', () => {
    const s = useTeahouseStore.getState();
    s.clearLevel('har-gow', 2);
    s.clearLevel('har-gow', 1); // lower — ignored
    s.clearLevel('har-gow', 3); // higher — kept
    const after = useTeahouseStore.getState();
    expect(after.clearedDishIds).toEqual(['har-gow']);
    expect(after.stars['har-gow']).toBe(3);
    expect(after.currentLevel).toBe(2); // still only one cleared
  });

  it('reset clears everything back to level 1', () => {
    const s = useTeahouseStore.getState();
    s.addMessage({ role: 'user', content: 'x' });
    s.clearLevel('siu-mai', 2);
    s.reset();
    const after = useTeahouseStore.getState();
    expect(after.messages).toEqual([]);
    expect(after.clearedDishIds).toEqual([]);
    expect(after.stars).toEqual({});
    expect(after.currentLevel).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/store/teahouseStore.test.ts`
Expected: FAIL — `clearLevel is not a function` / `currentLevel` undefined.

- [ ] **Step 3: Rewrite the store**

```ts
// lib/store/teahouseStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/lib/conversation/types';

export interface TeahouseState {
  messages: ChatMessage[];
  clearedDishIds: string[];
  stars: Record<string, number>;
  currentLevel: number;
  addMessage: (m: ChatMessage) => void;
  clearLevel: (id: string, stars: number) => void;
  reset: () => void;
}

const initial = {
  messages: [] as ChatMessage[],
  clearedDishIds: [] as string[],
  stars: {} as Record<string, number>,
  currentLevel: 1,
};

export const useTeahouseStore = create<TeahouseState>()(
  persist(
    (set) => ({
      ...initial,
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      clearLevel: (id, stars) =>
        set((s) => {
          const clearedDishIds = s.clearedDishIds.includes(id)
            ? s.clearedDishIds
            : [...s.clearedDishIds, id];
          const best = Math.max(s.stars[id] ?? 0, stars);
          return {
            clearedDishIds,
            stars: { ...s.stars, [id]: best },
            currentLevel: clearedDishIds.length + 1,
          };
        }),
      reset: () => set({ ...initial, stars: {} }),
    }),
    {
      name: 'tan-cha-store',
      version: 1,
      migrate: () => ({ ...initial, stars: {} }),
    },
  ),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/store/teahouseStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/store/teahouseStore.ts lib/store/teahouseStore.test.ts
git commit -m "feat: refactor store to cleared/stars/currentLevel quest progress"
```

---

### Task 5: Judge primitives + judge prompt

**Files:**
- Create: `lib/conversation/judge.ts`
- Test: `lib/conversation/judge.test.ts`
- Modify: `lib/conversation/prompt.ts`
- Test: `lib/conversation/prompt.test.ts` (append)

**Interfaces:**
- Consumes: `Dish` (types); `PERSONA_NAME`, `FALLBACK_LINES` (persona.ts).
- Produces:
  - `lib/conversation/judge.ts`: `interface JudgeResult { reply: string; stars: number; tip: string }`; `parseJudgeContent(raw: string): JudgeResult | null` (JSON.parse + shape/range validation, stars clamped to 1..3 integer); `buildJudgeFallback(dish: Dish, pass: boolean): JudgeResult` = `{ reply: <random FALLBACK_LINE>, stars: pass ? 2 : 0, tip: dish.task.hint }`.
  - `lib/conversation/prompt.ts`: `buildJudgePrompt(dish: Dish, transcript: string, pass: boolean): string` — persona + 當前關目標 + 玩家這句 + pass verdict + an instruction to reply ONLY as JSON `{"reply","stars","tip"}`. The literal substring `JSON` MUST appear (DeepSeek json_object mode requires the word "json" in the prompt).
- These are pure (no `server-only`), so both `route.ts` (server, Task 6) and `engine.ts`/`OrderChat` (client, Tasks 7/9) import them.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/conversation/judge.test.ts
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
```

```ts
// append to lib/conversation/prompt.test.ts
import { buildJudgePrompt } from '@/lib/conversation/prompt';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/conversation/judge.test.ts lib/conversation/prompt.test.ts`
Expected: FAIL — missing modules/exports.

- [ ] **Step 3a: Implement `lib/conversation/judge.ts`**

```ts
// lib/conversation/judge.ts
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
```

- [ ] **Step 3b: Add `buildJudgePrompt` to `lib/conversation/prompt.ts`** (keep existing exports unchanged; add import of `Dish` is already present)

```ts
// append to lib/conversation/prompt.ts
export function buildJudgePrompt(dish: Dish, transcript: string, pass: boolean): string {
  return [
    `你係香港老字號茶樓夥計「${PERSONA_NAME}」,人情味濃、貪玩。`,
    '只可以用地道粵語(粵文書寫:係、唔、嘅、咗、喺、嚟、俾),唔好用書面中文。講嘢簡短自然,一兩句就夠。',
    '',
    `【當前關目標】${dish.task.goal}`,
    `【玩家啱啱講】「${transcript}」`,
    `【系統判定】玩家${pass ? '已經做到' : '仲未做到'}本關要求。`,
    pass
      ? '【你要做】開心噉應佢、即刻上菜,順帶讚下佢用詞,再講一句鼓勵。'
      : '【你要做】親切噉提醒佢仲爭啲乜,叫佢再嚟一次,tip 俾返一句示範可以點講。',
    '',
    '只准用 JSON 格式回覆,唔好有任何其他文字。格式:',
    '{"reply": "點心姨即場粵文台詞", "stars": 1至3嘅整數(用詞越地道越高), "tip": "鼓勵或者示範句"}',
  ].join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/conversation/judge.test.ts lib/conversation/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/conversation/judge.ts lib/conversation/judge.test.ts lib/conversation/prompt.ts lib/conversation/prompt.test.ts
git commit -m "feat: add judge result parsing, fallback, and judge prompt builder"
```

---

### Task 6: DeepSeek JSON mode + judge route

**Files:**
- Modify: `lib/conversation/deepseek.ts`
- Modify: `app/api/chat/route.ts`
- Test: `app/api/chat/route.test.ts` (rewrite)

**Interfaces:**
- Consumes: `buildJudgePrompt` (prompt.ts), `parseJudgeContent`/`buildJudgeFallback`/`JudgeResult` (judge.ts), `DISHES` (data.ts), `callDeepSeek` (deepseek.ts).
- Produces:
  - `callDeepSeek(messages, opts?: { jsonMode?: boolean }): Promise<string>` — when `opts.jsonMode`, adds `response_format: { type: 'json_object' }` to the upstream body. Signature stays backward-compatible (second arg optional).
  - `POST /api/chat` new contract: request body `{ dishId: string; transcript: string; pass: boolean }`. Returns `200` with a `JudgeResult` (`{reply,stars,tip}`) on success OR fallback. Returns `400` `invalid_json` / `bad_request` / `unknown_dish` for malformed input. The key is never serialized into any response.

- [ ] **Step 1: Rewrite the route test**

```ts
// app/api/chat/route.test.ts
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubEnv('DEEPSEEK_API_BASE_URL', 'https://api.deepseek.test');
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-secret-key');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function judgeReq(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/chat (judge)', () => {
  it('requests json_object mode and returns the parsed judge result without leaking the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"reply":"好嘞!蝦餃嚟。","stars":3,"tip":"好地道"}' } }],
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ reply: '好嘞!蝦餃嚟。', stars: 3, tip: '好地道' });
    expect(JSON.stringify(body)).not.toContain('test-secret-key');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.deepseek.test/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-secret-key');
    const sent = JSON.parse(init.body);
    expect(sent.response_format).toEqual({ type: 'json_object' });
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[0].content).toContain('點心姨');
    expect(sent.messages[0].content).toContain('唔該嚟一籠蝦餃');
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq('not-json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 on a bad body without calling upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: 5, pass: true }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('test-secret-key');
  });

  it('returns 400 unknown_dish for an unrecognised dishId', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'nope', transcript: 'x', pass: false }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('unknown_dish');
  });

  it('falls back to a 200 judge result when upstream fails (game never breaks)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: 'x', pass: true }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(typeof body.reply).toBe('string');
    expect(body.stars).toBe(2);          // pass ? 2 : 0
    expect(body.tip).toBe('唔該嚟一籠蝦餃'); // har-gow hint
    expect(JSON.stringify(body)).not.toContain('test-secret-key');
  });

  it('falls back when the model returns unparseable content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'totally not json' } }] }),
    }));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(judgeReq({ dishId: 'har-gow', transcript: 'x', pass: false }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.stars).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/api/chat/route.test.ts`
Expected: FAIL — route still uses the old `{messages}` contract / no `response_format`.

- [ ] **Step 3a: Add JSON mode to `lib/conversation/deepseek.ts`**

```ts
// lib/conversation/deepseek.ts
import 'server-only';
import type { ChatMessage } from './types';

export async function callDeepSeek(
  messages: ChatMessage[],
  opts?: { jsonMode?: boolean },
): Promise<string> {
  const base = process.env.DEEPSEEK_API_BASE_URL;
  const key = process.env.DEEPSEEK_API_KEY;
  if (!base || !key) throw new Error('DeepSeek env not configured');

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.8,
      max_tokens: 400,
      ...(opts?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}
```

- [ ] **Step 3b: Rewrite `app/api/chat/route.ts`**

```ts
// app/api/chat/route.ts
import { callDeepSeek } from '@/lib/conversation/deepseek';
import { buildJudgePrompt } from '@/lib/conversation/prompt';
import { parseJudgeContent, buildJudgeFallback } from '@/lib/conversation/judge';
import { DISHES } from '@/lib/dishes/data';
import type { ChatMessage } from '@/lib/conversation/types';

interface JudgeRequest {
  dishId?: unknown;
  transcript?: unknown;
  pass?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  let body: JudgeRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { dishId, transcript, pass } = body;
  if (typeof dishId !== 'string' || typeof transcript !== 'string' || typeof pass !== 'boolean') {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const dish = DISHES.find((d) => d.id === dishId);
  if (!dish) {
    return Response.json({ error: 'unknown_dish' }, { status: 400 });
  }

  try {
    const system: ChatMessage = { role: 'system', content: buildJudgePrompt(dish, transcript, pass) };
    const user: ChatMessage = { role: 'user', content: transcript };
    const content = await callDeepSeek([system, user], { jsonMode: true });
    const parsed = parseJudgeContent(content);
    return Response.json(parsed ?? buildJudgeFallback(dish, pass));
  } catch {
    return Response.json(buildJudgeFallback(dish, pass));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/api/chat/route.test.ts`
Expected: PASS (all six cases, including the two no-key-leak fallbacks).

- [ ] **Step 5: Commit**

```bash
git add lib/conversation/deepseek.ts app/api/chat/route.ts app/api/chat/route.test.ts
git commit -m "feat: turn chat route into a JSON-mode judge endpoint with safe fallback"
```

---

> **Sequencing & build note (Tasks 7–11):** Tasks 4 (store) and 7 (engine) change shared APIs that the *still-unmigrated* `OrderChat.tsx`, `page.tsx`, and `ShareCardButton.tsx` consume. Between those tasks and their UI rewrites (9/10/11), a whole-project `npx tsc --noEmit` will report errors in the not-yet-migrated files. This is expected. For Tasks 4–10, run only the named test file in each step's command; the file's own vitest suite passes in isolation. Task 11 makes the whole app compile again, and Task 12 runs the full `npm test` + `tsc --noEmit` + `next build` green gate.

### Task 7: Client judge call (engine refactor)

**Files:**
- Modify: `lib/conversation/engine.ts`
- Test: `lib/conversation/engine.test.ts` (rewrite)

**Interfaces:**
- Consumes: `JudgeResult` from `lib/conversation/judge.ts`.
- Produces: `judgeOrder(input: { dishId: string; transcript: string; pass: boolean }): Promise<JudgeResult>` — POSTs the body to `/api/chat`, returns the parsed `JudgeResult` on `res.ok`, throws on non-ok. (OrderChat catches the throw and uses `buildJudgeFallback`.) The old `detectOrderedDishes`, `sendChat`, and `randomFallback` are REMOVED — dish-name matching now lives in `lib/game/checker.ts` and the persona fallback in `lib/conversation/judge.ts`.

- [ ] **Step 1: Rewrite the test**

```ts
// lib/conversation/engine.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { judgeOrder } from '@/lib/conversation/engine';

afterEach(() => vi.restoreAllMocks());

describe('judgeOrder', () => {
  it('POSTs the judge body and returns the parsed result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ reply: '好嘞!', stars: 3, tip: '好地道' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await judgeOrder({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true });
    expect(result).toEqual({ reply: '好嘞!', stars: 3, tip: '好地道' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/chat');
    expect(JSON.parse(init.body)).toEqual({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true });
  });

  it('throws on a non-ok response so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/conversation/engine.test.ts`
Expected: FAIL — `judgeOrder` not exported.

- [ ] **Step 3: Rewrite `lib/conversation/engine.ts`**

```ts
// lib/conversation/engine.ts
import type { JudgeResult } from './judge';

export async function judgeOrder(input: {
  dishId: string;
  transcript: string;
  pass: boolean;
}): Promise<JudgeResult> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`judge failed: ${res.status}`);
  return (await res.json()) as JudgeResult;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/conversation/engine.test.ts`
Expected: PASS. (Whole-project `tsc` will still flag the unmigrated `OrderChat.tsx`/`page.tsx` — expected per the sequencing note; resolved by Tasks 9/11.)

- [ ] **Step 5: Commit**

```bash
git add lib/conversation/engine.ts lib/conversation/engine.test.ts
git commit -m "feat: replace chat/detect engine with stateless judgeOrder client call"
```

---

### Task 8: VoiceOrderButton component

**Files:**
- Create: `components/VoiceOrderButton.tsx`
- Test: `components/VoiceOrderButton.test.tsx`

**Interfaces:**
- Consumes: `transcribeAudioBlob` from `lib/shadowing/transcribeApi.ts`.
- Produces: `VoiceOrderButton({ onTranscript, disabled }: { onTranscript: (transcript: string) => void; disabled?: boolean })`. Records via `MediaRecorder`, on stop runs `transcribeAudioBlob(blob)` and calls `onTranscript(transcript)`. Exposes stable class `.voice-order-button` with `[data-recording]` and `[data-busy]`. Mirrors the recording mechanics of `ShadowingButton` but yields the raw transcript (no scoring). `ShadowingButton.tsx` is left untouched (reused as the 跟讀 practice in OrderChat's hint scaffold).

- [ ] **Step 1: Write the failing test**

```tsx
// components/VoiceOrderButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoiceOrderButton } from '@/components/VoiceOrderButton';

describe('VoiceOrderButton', () => {
  it('renders an idle voice-order button', () => {
    render(<VoiceOrderButton onTranscript={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('voice-order-button');
    expect(btn).toHaveAttribute('data-recording', 'false');
  });

  it('is disabled when the disabled prop is set', () => {
    render(<VoiceOrderButton onTranscript={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/VoiceOrderButton.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// components/VoiceOrderButton.tsx
'use client';

import { useState } from 'react';
import { transcribeAudioBlob } from '@/lib/shadowing/transcribeApi';

export interface VoiceOrderButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceOrderButton({ onTranscript, disabled }: VoiceOrderButtonProps) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: BlobPart[] = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setBusy(true);
      try {
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
        const transcript = await transcribeAudioBlob(blob);
        onTranscript(transcript);
      } finally {
        setBusy(false);
      }
    };
    mr.start();
    setRecorder(mr);
    setRecording(true);
  }

  function stop() {
    recorder?.stop();
    setRecording(false);
  }

  return (
    <button
      type="button"
      className="voice-order-button"
      data-recording={recording}
      data-busy={busy}
      disabled={disabled || busy}
      onClick={recording ? stop : start}
    >
      {busy ? '聽緊…' : recording ? '停止' : '㩒住講粵語'}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/VoiceOrderButton.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/VoiceOrderButton.tsx components/VoiceOrderButton.test.tsx
git commit -m "feat: add VoiceOrderButton that records and yields an ASR transcript"
```

---

### Task 9: OrderChat quest orchestration UI

**Files:**
- Modify: `components/OrderChat.tsx` (full rewrite)
- Test: `components/OrderChat.test.tsx` (update)

**Interfaces:**
- Consumes: store (`messages`, `clearedDishIds`, `stars`, `addMessage`, `clearLevel`); `DISHES`; `checkOrder` (checker); `judgeOrder` (engine); `buildJudgeFallback`/`JudgeResult` (judge); `VoiceOrderButton`; `ShadowingButton`.
- Produces: the quest interaction surface. Current dish = `DISHES[clearedDishIds.length]`. Renders `.quest`/`.quest-level`/`.quest-skill`/`.quest-goal`, the `.order-chat-messages` thread (`.msg`/`.msg-user`/`.msg-assistant`), `.level-result[data-pass]` with `.stars`/`.star[data-filled]` and a tip on fail, the `.order-hint` scaffold (`.order-hint-button`/`.order-hint-phrase` + reused `ShadowingButton` practice), and the `.order-chat-form` with `VoiceOrderButton` + text fallback. A single `attempt(transcript)` path serves BOTH voice and text: `addMessage(user)` → `checkOrder` → `judgeOrder` (catch → `buildJudgeFallback`) → `addMessage(assistant reply)` → if `pass` `clearLevel(id, stars)`. When all dishes cleared, renders an `[data-all-cleared]` done state. A static greeting `.msg.msg-assistant` is shown only when `messages.length === 0` as a pure-display node — it is NOT written to the store (this preserves the store's persist/reset tests).

- [ ] **Step 1: Update the test**

```tsx
// components/OrderChat.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderChat } from '@/components/OrderChat';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';

beforeEach(() => useTeahouseStore.getState().reset());

describe('OrderChat', () => {
  it('renders a way to talk to 點心姨', () => {
    render(<OrderChat />);
    expect(screen.getByPlaceholderText(/點心姨/)).toBeInTheDocument();
  });

  it('shows the level-1 quest goal and a voice-order button at the start', () => {
    render(<OrderChat />);
    expect(screen.getByText(DISHES[0].task.goal)).toBeInTheDocument();
    expect(screen.getByText('第 1 關 / 10')).toBeInTheDocument();
    expect(document.querySelector('.voice-order-button')).toBeTruthy();
  });

  it('shows the all-cleared done state once every level is cleared', () => {
    const s = useTeahouseStore.getState();
    DISHES.forEach((d) => s.clearLevel(d.id, 3));
    render(<OrderChat />);
    expect(document.querySelector('[data-all-cleared]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/OrderChat.test.tsx`
Expected: FAIL — new quest text/markup not present in the old component.

- [ ] **Step 3: Rewrite `components/OrderChat.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { checkOrder } from '@/lib/game/checker';
import { judgeOrder } from '@/lib/conversation/engine';
import { buildJudgeFallback, type JudgeResult } from '@/lib/conversation/judge';
import type { OrderSkill } from '@/lib/dishes/types';
import { VoiceOrderButton } from './VoiceOrderButton';
import { ShadowingButton } from './ShadowingButton';

const GREETING = '好嘞,歡迎嚟到虛擬茶樓!跟住下面嘅目標,用粵語同姨嗌嘢飲茶啦。';

const SKILL_LABELS: Record<OrderSkill, string> = {
  name: '講出點心名',
  polite: '禮貌講法',
  quantity: '數量+量詞',
  modifier: '做法/限定',
  alias: '識別別名',
  price: '問價',
  multi: '一次兩樣',
  checkout: '埋單',
};

export function OrderChat() {
  const messages = useTeahouseStore((s) => s.messages);
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const addMessage = useTeahouseStore((s) => s.addMessage);
  const clearLevel = useTeahouseStore((s) => s.clearLevel);

  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<{ pass: boolean; judge: JudgeResult } | null>(null);

  const dish = DISHES[clearedDishIds.length];

  if (!dish) {
    return (
      <section className="order-chat" data-all-cleared>
        <p className="quest-goal">十關全部叹晒!睇下你嘅「今日飲茶」成績單啦。</p>
      </section>
    );
  }

  async function attempt(transcript: string) {
    const text = transcript.trim();
    if (!text || pending) return;
    setInput('');
    setShowHint(false);
    addMessage({ role: 'user', content: text });
    const { pass } = checkOrder(text, dish);
    setPending(true);
    let judge: JudgeResult;
    try {
      judge = await judgeOrder({ dishId: dish.id, transcript: text, pass });
    } catch {
      judge = buildJudgeFallback(dish, pass);
    }
    addMessage({ role: 'assistant', content: judge.reply });
    if (pass) clearLevel(dish.id, judge.stars);
    setResult({ pass, judge });
    setPending(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void attempt(input);
  }

  return (
    <section className="order-chat">
      <div className="quest">
        <span className="quest-level">第 {dish.task.level} 關 / 10</span>
        <ul className="quest-skill-list">
          {dish.task.skills.map((s) => (
            <li key={s} className="quest-skill">{SKILL_LABELS[s]}</li>
          ))}
        </ul>
        <p className="quest-goal">{dish.task.goal}</p>
      </div>

      <ul className="order-chat-messages">
        {messages.length === 0 && <li className="msg msg-assistant">{GREETING}</li>}
        {messages.map((m, i) => (
          <li key={i} className={`msg msg-${m.role}`}>{m.content}</li>
        ))}
      </ul>

      {result && (
        <div className="level-result" data-pass={result.pass}>
          <span className="stars" aria-label={`${result.judge.stars} 粒星`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className="star" data-filled={n <= result.judge.stars} aria-hidden>★</span>
            ))}
          </span>
          {!result.pass && <p className="level-result-tip">{result.judge.tip}</p>}
        </div>
      )}

      <div className="order-hint">
        <button type="button" className="order-hint-button" onClick={() => setShowHint((v) => !v)}>
          唔識講?
        </button>
        {showHint && (
          <div className="order-hint-body">
            <p className="order-hint-phrase">{dish.task.hint}</p>
            <ShadowingButton targetPhrase={dish.task.hint} onResult={() => {}} />
          </div>
        )}
      </div>

      <form className="order-chat-form" onSubmit={submit}>
        <VoiceOrderButton onTranscript={(t) => void attempt(t)} disabled={pending} />
        <input
          className="order-chat-input"
          placeholder="同點心姨講…(例如:唔該嚟一籠蝦餃)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={pending}>{pending ? '…' : '嗌'}</button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/OrderChat.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/OrderChat.tsx components/OrderChat.test.tsx
git commit -m "feat: rebuild OrderChat as the voice/text ordering quest surface"
```

---

### Task 10: Share card reflects clears + total stars

The share card no longer has a "best pronunciation score" — the v2 model has
no score. It now shows **how many dishes were cleared** and the **total stars**
earned. `buildShareCardData` switches its input from `{ orderedDishIds, bestScore }`
to `{ clearedDishIds, stars }`; the footer line becomes `叹咗 N 道 · M 粒星`.

**Files:**
- Modify: `lib/share/shareCard.ts`
- Modify: `components/ShareCardButton.tsx`
- Test: `lib/share/shareCard.test.ts` (rewrite)

**Interfaces:**
- Consumes: `Dish` (Task 2); store fields `clearedDishIds: string[]` and
  `stars: Record<string, number>` (Task 4).
- Produces: `ShareCardData { date: string; dishes: { nameYue: string; emoji: string }[]; clearedCount: number; totalStars: number }`;
  `buildShareCardData({ dishes, clearedDishIds, stars, date? }) → ShareCardData`;
  `drawShareCard(ctx, data)`; `generateShareCardBlob(data)` (unchanged signature).

- [ ] **Step 1: Rewrite the failing test**

Replace the entire contents of `lib/share/shareCard.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/share/shareCard.test.ts`
Expected: FAIL — `buildShareCardData` still expects `orderedDishIds`/`bestScore`,
and `data.clearedCount` / `data.totalStars` are `undefined`.

- [ ] **Step 3: Update `lib/share/shareCard.ts`**

Replace the `ShareCardData` interface, `buildShareCardData`, and the footer
line of `drawShareCard`. Full file after edit:

```ts
import type { Dish } from '@/lib/dishes/types';

export interface ShareCardData {
  date: string;
  dishes: { nameYue: string; emoji: string }[];
  clearedCount: number;
  totalStars: number;
}

export function buildShareCardData(input: {
  dishes: Dish[];
  clearedDishIds: string[];
  stars: Record<string, number>;
  date?: Date;
}): ShareCardData {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(input.date ?? new Date());
  const dishes = input.clearedDishIds
    .map((id) => input.dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d))
    .map((d) => ({ nameYue: d.nameYue, emoji: d.emoji }));
  const totalStars = Object.values(input.stars).reduce((a, b) => a + b, 0);
  return { date, dishes, clearedCount: dishes.length, totalStars };
}

const WIDTH = 600;
const HEIGHT = 800;

export function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData): void {
  ctx.fillStyle = '#f7f1e3';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#7a4a2b';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('今日飲茶', 48, 96);

  ctx.font = '24px sans-serif';
  ctx.fillText(data.date, 48, 144);

  ctx.font = '30px sans-serif';
  data.dishes.forEach((d, i) => {
    ctx.fillText(`${d.emoji}  ${d.nameYue}`, 48, 220 + i * 56);
  });

  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`叹咗 ${data.clearedCount} 道 · ${data.totalStars} 粒星`, 48, HEIGHT - 56);
}

export async function generateShareCardBlob(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  drawShareCard(ctx, data);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
```

- [ ] **Step 4: Update `components/ShareCardButton.tsx`**

Switch the two store reads from `orderedDishIds`/`bestScore` to
`clearedDishIds`/`stars`, and pass them through. Full file after edit:

```tsx
'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { buildShareCardData, generateShareCardBlob } from '@/lib/share/shareCard';

export function ShareCardButton() {
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const stars = useTeahouseStore((s) => s.stars);

  async function download() {
    const data = buildShareCardData({ dishes: DISHES, clearedDishIds, stars });
    const blob = await generateShareCardBlob(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `今日飲茶-${data.date}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="share-card-button" onClick={download}>
      生成「今日飲茶」分享卡
    </button>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/share/shareCard.test.ts`
Expected: PASS.

> **Note:** whole-project `npx tsc --noEmit` is still expected RED here — the
> only remaining unmigrated file is `app/page.tsx` (still reads the old store
> fields). Task 11 closes that. Do NOT try to "fix" tsc inside this task.

- [ ] **Step 6: Commit**

```bash
git add lib/share/shareCard.ts lib/share/shareCard.test.ts components/ShareCardButton.tsx
git commit -m "feat: rebuild share card around cleared count and total stars"
```

---

### Task 11: Wire the page to the quest store

The home page drops the entire "跟讀練習" (shadowing-practice) loop, the
`DishCard`/`ShadowingButton` rows, and the old `setBestScore`/`addStamp`
handlers. It now composes just three things: the quest surface (`OrderChat`),
the stamp book (fed `clearedDishIds`), and the share-card button (revealed only
once all 10 dishes are cleared). **This is the task that makes the whole project
type-check again** — after it, `npx tsc --noEmit` must be GREEN.

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: store field `clearedDishIds: string[]` (Task 4); `DISHES` (Task 2);
  `OrderChat` (Task 9, no props); `StampBook` (unchanged, props
  `{ dishes: Dish[]; stampedDishIds: string[] }`); `ShareCardButton` (Task 10,
  no props).
- Produces: nothing downstream — this is the composition root.

> **Why no unit test:** `app/page.tsx` is the composition root — it has no logic
> of its own, only wiring. Its correctness is verified by `tsc` (the types of
> every child must line up) plus the manual E2E walkthrough in Task 12. Adding a
> render test here would only re-assert what the child component tests already
> cover.

- [ ] **Step 1: Rewrite `app/page.tsx`**

Replace the entire file with:

```tsx
'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { OrderChat } from '@/components/OrderChat';
import { StampBook } from '@/components/StampBook';
import { ShareCardButton } from '@/components/ShareCardButton';

export default function Page() {
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const allCleared = clearedDishIds.length >= DISHES.length;

  return (
    <main className="teahouse">
      <h1>叹茶 · 虛擬茶樓</h1>
      <OrderChat />
      <StampBook dishes={DISHES} stampedDishIds={clearedDishIds} />
      {allCleared && <ShareCardButton />}
    </main>
  );
}
```

- [ ] **Step 2: Type-check the whole project — expect GREEN**

Run: `npx tsc --noEmit`
Expected: PASS with no errors. Every consumer of the old store shape
(`orderedDishIds`, `bestScore`, `stampedDishIds`, `markOrdered`, `addStamp`,
`setBestScore`) and of the removed engine exports (`sendChat`,
`detectOrderedDishes`) has now been migrated, so the project compiles clean.

> If `tsc` still reports errors here, do NOT add `any` or stubs to silence them
> — a remaining error means an earlier task's edit was incomplete. Read the
> error, find the offending file, and reconcile it with the interfaces those
> tasks declared.

- [ ] **Step 3: Run the full test suite as a checkpoint**

Run: `npm test`
Expected: PASS — every test file green. (`DishCard` keeps its own passing test
even though the page no longer renders it; it remains a reusable contract
component.)

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire home page to the ordering-quest store"
```

---

### Task 12: Refresh the integration contract & full green gate

Update `docs/INTEGRATION.md` so the open-design re-skin work targets the v2
class/prop surface (the quest UI, the voice button, the new data flow), then run
the complete green gate — full tests, full type-check, production build — and
walk the manual E2E checklist end-to-end.

**Files:**
- Modify: `docs/INTEGRATION.md`

**Interfaces:**
- Consumes: the final class/prop names from Tasks 8–11. No code consumes this
  doc — it is the human contract for the visual pass.
- Produces: nothing downstream.

- [ ] **Step 1: Replace `docs/INTEGRATION.md`**

Replace the entire file with:

```markdown
# 前端整合契約 (for open-design re-skinning)

逻辑、数据、API、判分、闯关流程已完成。视觉设计用 open-design 产出后,按下表把
样式套到对应组件 / class 上即可,**唔好改动 props 同 class 名**(否则会断开逻辑)。

## 组件清单与 props

| 组件 | Props | 作用 | 可套样式的 class |
|---|---|---|---|
| `OrderChat` | 无(自接 store) | 闯关主界面:出关卡目标、收语音/文字、判分、盖章 | `.order-chat`, `[data-all-cleared]`(全清通关态), `.quest`, `.quest-level`, `.quest-skill-list`, `.quest-skill`, `.quest-goal`, `.order-chat-messages`, `.msg`(每条消息都有), `.msg-user`, `.msg-assistant`, `.level-result` + `[data-pass]`, `.stars`, `.star` + `[data-filled]`, `.level-result-tip`, `.order-hint`, `.order-hint-button`, `.order-hint-body`, `.order-hint-phrase`, `.order-chat-form`, `.order-chat-input` |
| `VoiceOrderButton` | `{ onTranscript(text: string): void; disabled?: boolean }` | 㩒住录音 → DimSum ASR → 回传转写文 | `.voice-order-button`, `[data-recording]`, `[data-busy]` |
| `ShadowingButton` | `{ targetPhrase: string; onResult(score, transcript): void }` | 录音→ASR→打分(喺「唔識講?」示范句下复用) | `.shadowing-button`, `[data-recording]` |
| `DishCard` | `{ dish: Dish }` | 单个点心:粤文/粤拼/文化注解(可复用组件,主流程暂未渲染) | `.dish-card`, `.dish-name-yue`, `.dish-jyutping`, `.dish-name-alt`, `.dish-note` |
| `StampBook` | `{ dishes: Dish[]; stampedDishIds: string[] }` | 集章册(主页传入 `clearedDishIds`) | `.stamp-book`, `.stamp`, `[data-stamped]` |
| `ShareCardButton` | 无(自接 store) | 生成「今日飲茶」分享卡 png(全清后先出现) | `.share-card-button` |

## 数据流

1. 每关 `OrderChat` 由 `DISHES[clearedDishIds.length]` 取当前点心,展示
   `dish.task.goal`(目标)同 `dish.task.skills`(要练嘅技能)。
2. 用户撳 `VoiceOrderButton` 讲粤语 → `transcribeAudioBlob`(DimSum ASR)→ 转写文;
   或直接喺 `.order-chat-input` 打字。两条路都入同一个 `attempt(transcript)`。
3. `attempt` 先用**确定性** `checkOrder(transcript, dish)` 判 `pass`(离线、零成本、
   断网都玩得;唯一过关权威)。
4. 再 `judgeOrder({ dishId, transcript, pass })` POST `/api/chat` → server 用
   `deepseek-chat` JSON mode 回 `{reply, stars, tip}`(點心姨台词 + 1–3 粒星 +
   提示);**净係增味**,唔改过关结果。失败 / 断网 → `buildJudgeFallback(dish, pass)`
   出固定粤语句 + `pass ? 2 : 0` 星 + `dish.task.hint`。
5. `pass` → `clearLevel(dish.id, stars)`:记关、留最高星、`currentLevel` 进位。
6. 叹够 10 关 → `OrderChat` 入 `[data-all-cleared]`;主页显示 `ShareCardButton` →
   `buildShareCardData({ clearedDishIds, stars })` → canvas 画卡 → 下载。

## 关键约束

- `DEEPSEEK_API_KEY` 只喺 `lib/conversation/deepseek.ts`(`server-only`)同
  `app/api/chat/route.ts` 出现,**永不入浏览器、永不 log、永不入 response body**。
  唔好喺任何 client 组件 import `deepseek.ts`。
- 过关与否由 `lib/game/checker.ts` 嘅 `checkOrder` **确定性**决定;DeepSeek 只供台词
  同星数。两边都用 `normalizeForCompare`(繁→简 + 去标点)桥接 ASR 嘅繁简输出。
- 点心数据单一来源:`lib/dishes/data.ts` 嘅 `DISHES`;每道点心嘅关卡喺 `dish.task`。
  加点心淨係改呢度。
- persist key 系 `tan-cha-store`(version 1,升级 `migrate` 直接重置)。

## 手动验收清单 (manual E2E checklist)

- [ ] 第 1 关:見到目标「用粵語唔該姨嚟一籠蝦餃」→ 撳「㩒住講粵語」讲「唔該嚟一籠
      蝦餃」→ 見到 點心姨 **粤文**回应 + 1–3 粒星(`.star[data-filled]`)+ 该点心盖章。
- [ ] 故意讲漏(净讲「蝦餃」冇「唔該」)→ 判 fail(`.level-result[data-pass=false]`、
      0 粒星)+ `.level-result-tip` 提示;关数唔郁。
- [ ] 撳「唔識講?」→ 展开 `.order-hint-body`:見到示范句 + 可跟读(ShadowingButton)。
- [ ] 喺文字框打「唔該嚟一籠蝦餃」→ 同样判分(text fallback 生效,唔靠麦克风)。
- [ ] 断网或令 `/api/chat` 失败 → 仍出 fallback 粤语句 + `pass ? 2 : 0` 星 + hint,
      游戏唔卡死。
- [ ] 叹够 10 关 → `OrderChat` 入 `[data-all-cleared]` 完成态;`ShareCardButton` 出现
      → 下载到一张列出已清点心 + `叹咗 10 道 · N 粒星` 嘅 png。
- [ ] 刷新页面 → `clearedDishIds` / `stars` / `currentLevel` 仍在(localStorage
      persist,key `tan-cha-store`)。
- [ ] DevTools → Network 睇 `/api/chat` 嘅 response → 净系 `{reply, stars, tip}`,
      **冇** key、**冇** prompt 内部内容。
- [ ] DevTools → Network 同 Sources 搜 `DEEPSEEK_API_KEY` 同 key 片段 → **搜唔到**。
```

- [ ] **Step 2: Full test suite — final green gate**

Run: `npm test`
Expected: PASS — every test file green (vocab, checker, store, judge, route,
VoiceOrderButton, OrderChat, shareCard, DishCard, StampBook, plus any pre-existing).

- [ ] **Step 3: Full type-check**

Run: `npx tsc --noEmit`
Expected: PASS, zero errors.

- [ ] **Step 4: Production build**

Run: `npx next build`
Expected: Clean build, no type or lint failures.

- [ ] **Step 5: Manual E2E walkthrough**

Start the dev server (`npm run dev`) and walk every box in the
`docs/INTEGRATION.md` "手动验收清单" above — including the two security checks
(no key in `/api/chat` response body; no key string anywhere in Network/Sources).
Confirm the game degrades gracefully with `/api/chat` forced to fail.

- [ ] **Step 6: Commit**

```bash
git add docs/INTEGRATION.md
git commit -m "docs: update integration contract for the ordering-quest redesign"
```

---

## Self-Review & Spec Coverage

Run this map before dispatching Task 1; every spec section must point to a task.

| Spec area | Task(s) |
|---|---|
| 8-skill ladder vocabulary (polite/number/measure/price/checkout) | Task 1 |
| `OrderSkill` / `DishTask` types + 10 per-dish goals on `DISHES` | Task 2 |
| Deterministic `checkOrder` (sole pass authority) +繁简 normalization | Task 3 |
| Store model: `clearedDishIds` / `stars` / `currentLevel` + persist v1 migrate | Task 4 |
| DeepSeek judge `{reply, stars, tip}` parse/clamp + `buildJudgeFallback` + prompt | Task 5 |
| `deepseek.ts` JSON mode + stateless `/api/chat` `{dishId, transcript, pass}` route | Task 6 |
| `judgeOrder` engine call; remove old `sendChat`/`detectOrderedDishes` | Task 7 |
| `VoiceOrderButton` (record → DimSum ASR → transcript) | Task 8 |
| `OrderChat` quest surface (goal/skills/judge/stamp/hint, voice+text) | Task 9 |
| Share card → cleared count + total stars | Task 10 |
| Page composition; whole-project tsc green | Task 11 |
| Integration contract + full green gate + manual E2E | Task 12 |

**Deliberate scope decisions (carried from the spec, not gaps):**
- **"最地道嗰句" is out of scope.** The §7.2 store model stores no transcripts, so
  the share card surfaces 关数 + 总星 only — there is nothing to source a "most
  地道 line" from in the v2 data model. Documented here so a reviewer doesn't flag
  it as missing.
- **`DishCard` is intentionally kept** though the page no longer renders it: it is
  a reusable contract component with its own passing test.
- **Greeting is pure-display**, never written to the store — this preserves the
  store's persist and `reset clears everything` tests.

**Placeholder scan:** none — every code step contains the full file or full
function body to write; no "TBD" / "add error handling" / "similar to Task N".

**Type-consistency check:** the names that cross task boundaries line up —
`checkOrder(transcript, dish) → { pass, hit }` (Task 3) feeds Task 9's `attempt`
and the route in Task 6; `JudgeResult { reply, stars, tip }` (Task 5) is the
single shape returned by `buildJudgeFallback`, `parseJudgeContent`, `judgeOrder`,
and the route; `clearLevel(id, stars)` (Task 4) is called only with a
`JudgeResult.stars`; `clearedDishIds` / `stars` are read identically by Tasks
9, 10, 11.
