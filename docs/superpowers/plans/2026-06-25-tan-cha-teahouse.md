# 叹茶·虚拟茶楼 (Tan Cha · Virtual Teahouse) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the non-visual core of a Cantonese "virtual teahouse" web app where a user orders dim sum in colloquial 粤语 to an AI character (點心姨), gets pronunciation scoring on key ordering phrases, and collects a stamp book of authentic dish lore.

**Architecture:** Next.js 15 App Router app. All business logic lives in framework-light `lib/` modules (data, scoring, API clients, prompt builder, store, share-card) that are pure/unit-testable. The DeepSeek key never reaches the browser: a server-side Route Handler (`app/api/chat`) injects the persona + RAG-lite dish context system prompt and proxies to DeepSeek. DimSum services (corpus, jyutping, ASR transcribe) are public and called directly. Functional React components in `components/` are the **integration contract** — they wire the logic with minimal styling, and the user re-skins them with open-design output.

**Tech Stack:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Zustand (+persist), opencc-js (traditional→simplified for scoring), Vitest + @testing-library/react (jsdom) for tests.

## Global Constraints

- **粤文 only for character output**: 點心姨 speaks written Cantonese (粤文: 係/唔/嘅/咗/喺/佢/嚟/啲/乜嘢), never書面中文 (Mandarin-style written Chinese). This rule is enforced in the system prompt verbatim.
- **DeepSeek key is server-side only**: `DEEPSEEK_API_KEY` and `DEEPSEEK_API_BASE_URL` are read **only** inside `lib/conversation/deepseek.ts` (imported with `server-only`) and `app/api/chat/route.ts`. Never reference them in any `NEXT_PUBLIC_*` var, client component, or test snapshot. Never log the key.
- **`.env.local` is never committed**: the scaffold's `.gitignore` must ignore `.env*`. Also ignore `*:Zone.Identifier` (WSL artifacts).
- **Verified DimSum endpoints (public, no key)** — use these exact strings:
  - Corpus item: `GET https://backend.aidimsum.com/v2/corpus_item?unique_id=<uuid>`
  - Jyutping: `POST {NEXT_PUBLIC_API_URL}/api/to_jyutping` body `{"text":"..."}` → `{content}`
  - Transcribe (ASR): `POST {NEXT_PUBLIC_API_URL}/api/transcribe` multipart `file=<wav>`, `task=transcribe` → `{text}`
  - `NEXT_PUBLIC_API_URL` defaults to `https://api.shadowing.app.aidimsum.com`.
- **DeepSeek endpoint (empirically verified 2026-06-25)**: `POST {DEEPSEEK_API_BASE_URL}/chat/completions`, base `https://api.deepseek.com`, model `deepseek-chat`. Produces authentic 粤文 with the persona system prompt.
- **TDD**: every task is failing test → run/fail → implement → run/pass → commit. No placeholders.
- **Out of scope (user owns via open-design)**: visual design, color/layout/illustration, final CSS. Components here are functional + minimally styled; their **props are the contract** the design layer consumes.

## File Structure

```
app/
  api/chat/route.ts          # server-side DeepSeek proxy (key stays here)
  page.tsx                   # wires components into one teahouse screen
  globals.css                # tailwind entry (user re-skins)
components/
  OrderChat.tsx              # message list + input; calls sendChat + store
  ShadowingButton.tsx        # record → transcribe → score → onScore callback
  DishCard.tsx               # one dish: 粤文 / jyutping / cultural note
  StampBook.tsx              # grid of dishes, stamped vs not
  ShareCardButton.tsx        # build data → canvas → download png
lib/
  dishes/types.ts            # Dish, DishCategory
  dishes/data.ts             # DISHES seed (10 dishes)
  shadowing/levenshtein.ts   # pure distance + similarityRatio
  shadowing/normalize.ts     # normalizeForCompare (opencc t→cn + strip)
  shadowing/textSimilarity.ts# calculateTextSimilarity
  shadowing/wavEncoder.ts    # encodeWAV (pure PCM→WAV)
  shadowing/transcribeApi.ts # convertBlobToWav, transcribeAudioBlob
  corpus/types.ts            # CorpusItem (raw), CorpusCard (clean)
  corpus/client.ts           # fetchCorpusItem, transformCorpusItem
  jyutping/client.ts         # fetchJyutping
  conversation/types.ts      # ChatMessage
  conversation/persona.ts    # PERSONA_NAME, FALLBACK_LINES
  conversation/prompt.ts     # buildDishContext, buildSystemPrompt
  conversation/deepseek.ts   # callDeepSeek (server-only)
  conversation/engine.ts     # detectOrderedDishes, sendChat (client)
  store/teahouseStore.ts     # zustand + persist
  share/shareCard.ts         # buildShareCardData, drawShareCard, generateShareCardBlob
test setup: vitest.config.ts, vitest.setup.ts
```

---

### Task 1: Scaffold Next.js app + test tooling

**Files:**
- Create (generated): `package.json`, `tsconfig.json`, `app/`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Create: `lib/__smoke__/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` (Vitest, jsdom) and `@/*` import alias → repo root. All later tasks rely on both.

- [ ] **Step 1: Scaffold Next.js into the existing directory (preserves `.env.local` + `docs/`)**

```bash
cd /home/stardust/dev/AI-DimSum
npx --yes create-next-app@latest /tmp/tan-cha-init \
  --ts --tailwind --app --no-src-dir --no-eslint --use-npm --turbopack \
  --import-alias "@/*"
rm -rf /tmp/tan-cha-init/.git
cp -r /tmp/tan-cha-init/. /home/stardust/dev/AI-DimSum/
rm -rf /tmp/tan-cha-init
```

- [ ] **Step 2: Install runtime + test dependencies**

```bash
cd /home/stardust/dev/AI-DimSum
npm install zustand opencc-js
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event \
  @types/opencc-js
```

- [ ] **Step 3: Add the test script to `package.json`**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
});
```

- [ ] **Step 5: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Write the smoke test `lib/__smoke__/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs and resolves the @ alias root', async () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run the smoke test — verify it passes**

Run: `npm test`
Expected: PASS (1 test). If `@` alias or jsdom is misconfigured, this fails — fix before continuing.

- [ ] **Step 8: Ensure `.gitignore` protects secrets, then init git and commit**

Confirm `.gitignore` contains `.env*` (create-next-app adds it). Append the WSL artifact rule:

```bash
cd /home/stardust/dev/AI-DimSum
grep -q 'Zone.Identifier' .gitignore || printf '\n# WSL artifacts\n*:Zone.Identifier\n' >> .gitignore
grep -q '.env' .gitignore || printf '\n.env*\n' >> .gitignore
git init
git add -A
git status --short | grep -q '.env.local' && echo "DANGER: .env.local staged — abort" && exit 1
git commit -m "chore: scaffold Next.js 15 app with Vitest harness"
```

Expected: commit succeeds; `.env.local` is NOT in the commit.

---

### Task 2: Dish seed data + types

**Files:**
- Create: `lib/dishes/types.ts`
- Create: `lib/dishes/data.ts`
- Test: `lib/dishes/data.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Dish { id: string; nameYue: string; jyutping: string; namePutonghua: string; nameEn: string; category: DishCategory; emoji: string; culturalNote: string; orderPhrase: string; orderPhraseJyutping: string; corpusUuid?: string }`
  - `type DishCategory = 'steamed' | 'fried' | 'baked' | 'congee' | 'dessert'`
  - `const DISHES: Dish[]` (10 dishes). Used by prompt builder, store, components, share card.

- [ ] **Step 1: Write the failing test `lib/dishes/data.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { DISHES } from '@/lib/dishes/data';

describe('DISHES seed', () => {
  it('has 10 dishes with unique ids', () => {
    expect(DISHES).toHaveLength(10);
    const ids = new Set(DISHES.map((d) => d.id));
    expect(ids.size).toBe(10);
  });

  it('every dish has non-empty required fields', () => {
    for (const d of DISHES) {
      for (const key of ['nameYue', 'jyutping', 'namePutonghua', 'nameEn', 'emoji', 'culturalNote', 'orderPhrase', 'orderPhraseJyutping'] as const) {
        expect(d[key], `${d.id}.${key}`).toBeTruthy();
      }
    }
  });

  it('includes 蝦餃 with a Cantonese order phrase', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow');
    expect(harGow?.nameYue).toBe('蝦餃');
    expect(harGow?.orderPhrase).toContain('蝦餃');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- data.test`
Expected: FAIL ("Cannot find module '@/lib/dishes/data'").

- [ ] **Step 3: Create `lib/dishes/types.ts`**

```ts
export type DishCategory = 'steamed' | 'fried' | 'baked' | 'congee' | 'dessert';

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
}
```

- [ ] **Step 4: Create `lib/dishes/data.ts`**

```ts
import type { Dish } from './types';

export const DISHES: Dish[] = [
  {
    id: 'har-gow',
    nameYue: '蝦餃',
    jyutping: 'haa1 gaau2',
    namePutonghua: '虾饺',
    nameEn: 'Shrimp dumpling',
    category: 'steamed',
    emoji: '🦐',
    culturalNote: '茶樓「四大天王」之首,水晶皮包鮮蝦,正宗要做夠「十三摺」先夠靚。',
    orderPhrase: '唔該嚟一籠蝦餃',
    orderPhraseJyutping: 'm4 goi1 lai4 jat1 lung4 haa1 gaau2',
  },
  {
    id: 'siu-mai',
    nameYue: '燒賣',
    jyutping: 'siu1 maai2',
    namePutonghua: '烧卖',
    nameEn: 'Siu mai',
    category: 'steamed',
    emoji: '🥟',
    culturalNote: '黃皮豬肉蝦肉做餡,頂上點粒蟹籽,係茶樓「四大天王」之一。',
    orderPhrase: '嚟一籠燒賣',
    orderPhraseJyutping: 'lai4 jat1 lung4 siu1 maai2',
  },
  {
    id: 'char-siu-bao',
    nameYue: '叉燒包',
    jyutping: 'caa1 siu1 baau1',
    namePutonghua: '叉烧包',
    nameEn: 'BBQ pork bun',
    category: 'steamed',
    emoji: '🍖',
    culturalNote: '「四大天王」之一,蒸到爆口先正宗,鬆軟麵皮包蜜汁叉燒。',
    orderPhrase: '我要兩個叉燒包',
    orderPhraseJyutping: 'ngo5 jiu3 loeng5 go3 caa1 siu1 baau1',
  },
  {
    id: 'fung-zaau',
    nameYue: '鳳爪',
    jyutping: 'fung6 zaau2',
    namePutonghua: '凤爪',
    nameEn: 'Braised chicken feet',
    category: 'steamed',
    emoji: '🐔',
    culturalNote: '豉汁蒸雞腳,入味鬆化甩骨,係一眾老茶客嘅至愛。',
    orderPhrase: '一碟豉汁鳳爪',
    orderPhraseJyutping: 'jat1 dip6 si6 zap1 fung6 zaau2',
  },
  {
    id: 'cheung-fan',
    nameYue: '腸粉',
    jyutping: 'coeng4 fan2',
    namePutonghua: '肠粉',
    nameEn: 'Rice noodle roll',
    category: 'steamed',
    emoji: '🍥',
    culturalNote: '米漿蒸成薄皮,包蝦、叉燒或者牛肉,淋上甜豉油至滑。',
    orderPhrase: '嚟條蝦腸',
    orderPhraseJyutping: 'lai4 tiu4 haa1 coeng2',
  },
  {
    id: 'daan-taat',
    nameYue: '蛋撻',
    jyutping: 'daan6 taat1',
    namePutonghua: '蛋挞',
    nameEn: 'Egg tart',
    category: 'baked',
    emoji: '🥧',
    culturalNote: '港式酥皮或牛油皮,蛋漿香滑,焗到啱啱好至流心。',
    orderPhrase: '兩個蛋撻唔該',
    orderPhraseJyutping: 'loeng5 go3 daan6 taat1 m4 goi1',
  },
  {
    id: 'no-mai-gai',
    nameYue: '糯米雞',
    jyutping: 'no6 mai5 gai1',
    namePutonghua: '糯米鸡',
    nameEn: 'Lotus leaf glutinous rice',
    category: 'steamed',
    emoji: '🍚',
    culturalNote: '荷葉包住糯米、雞肉同瑤柱,蒸到荷葉清香滲入飯。',
    orderPhrase: '一個糯米雞',
    orderPhraseJyutping: 'jat1 go3 no6 mai5 gai1',
  },
  {
    id: 'lau-sa-bao',
    nameYue: '流沙包',
    jyutping: 'lau4 saa1 baau1',
    namePutonghua: '流沙包',
    nameEn: 'Custard lava bun',
    category: 'steamed',
    emoji: '🌟',
    culturalNote: '咬開鹹蛋黃奶黃會「流沙」,要趁熱食先夠驚喜。',
    orderPhrase: '嚟籠流沙包',
    orderPhraseJyutping: 'lai4 lung4 lau4 saa1 baau1',
  },
  {
    id: 'maa-laai-gou',
    nameYue: '馬拉糕',
    jyutping: 'maa5 laai1 gou1',
    namePutonghua: '马拉糕',
    nameEn: 'Malay sponge cake',
    category: 'baked',
    emoji: '🍞',
    culturalNote: '紅糖發酵蒸糕,鬆軟有蜂窩氣孔,茶樓懷舊味道。',
    orderPhrase: '切件馬拉糕',
    orderPhraseJyutping: 'cit3 gin6 maa5 laai1 gou1',
  },
  {
    id: 'teng-zai-zuk',
    nameYue: '艇仔粥',
    jyutping: 'teng5 zai2 zuk1',
    namePutonghua: '艇仔粥',
    nameEn: 'Sampan congee',
    category: 'congee',
    emoji: '🥣',
    culturalNote: '源自廣州荔灣艇家,粥底滾魚片、花生同油炸鬼,鮮味十足。',
    orderPhrase: '一碗艇仔粥',
    orderPhraseJyutping: 'jat1 wun2 teng5 zai2 zuk1',
  },
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- data.test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/dishes/
git commit -m "feat: add dim sum dish seed data and types"
```

---

### Task 3: Pronunciation scoring core (levenshtein + normalize + similarity)

**Files:**
- Create: `lib/shadowing/levenshtein.ts`
- Create: `lib/shadowing/normalize.ts`
- Create: `lib/shadowing/textSimilarity.ts`
- Test: `lib/shadowing/levenshtein.test.ts`, `lib/shadowing/textSimilarity.test.ts`

**Interfaces:**
- Consumes: `opencc-js`.
- Produces:
  - `function levenshtein(a: string, b: string): number`
  - `function similarityRatio(a: string, b: string): number` (0–100)
  - `function normalizeForCompare(text: string): string`
  - `function calculateTextSimilarity(text1: string, text2: string): number` (0–100). Used by `ShadowingButton`.

- [ ] **Step 1: Write the failing test `lib/shadowing/levenshtein.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { levenshtein, similarityRatio } from '@/lib/shadowing/levenshtein';

describe('levenshtein', () => {
  it('is 0 for identical strings', () => {
    expect(levenshtein('蝦餃', '蝦餃')).toBe(0);
  });
  it('counts single-character edits', () => {
    expect(levenshtein('蝦餃', '蝦餃包')).toBe(1);
    expect(levenshtein('abc', 'axc')).toBe(1);
  });
  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('similarityRatio', () => {
  it('is 100 for identical strings', () => {
    expect(similarityRatio('蝦餃', '蝦餃')).toBe(100);
  });
  it('is 100 for two empty strings', () => {
    expect(similarityRatio('', '')).toBe(100);
  });
  it('is between 0 and 100 for partial matches', () => {
    const r = similarityRatio('唔該嚟一籠蝦餃', '嚟一籠蝦餃');
    expect(r).toBeGreaterThan(50);
    expect(r).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- levenshtein.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `lib/shadowing/levenshtein.ts`**

```ts
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshtein(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- levenshtein.test`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing test `lib/shadowing/textSimilarity.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeForCompare } from '@/lib/shadowing/normalize';
import { calculateTextSimilarity } from '@/lib/shadowing/textSimilarity';

describe('normalizeForCompare', () => {
  it('strips punctuation and whitespace', () => {
    expect(normalizeForCompare('唔該, 嚟一籠!')).toBe(normalizeForCompare('唔該嚟一籠'));
  });
  it('converts traditional to simplified so they compare equal', () => {
    expect(normalizeForCompare('蝦餃')).toBe(normalizeForCompare('虾饺'));
  });
});

describe('calculateTextSimilarity', () => {
  it('scores identical phrases 100', () => {
    expect(calculateTextSimilarity('唔該嚟一籠蝦餃', '唔該嚟一籠蝦餃')).toBe(100);
  });
  it('ignores punctuation differences', () => {
    expect(calculateTextSimilarity('唔該,嚟一籠蝦餃。', '唔該嚟一籠蝦餃')).toBe(100);
  });
  it('scores traditional vs simplified of the same phrase 100', () => {
    expect(calculateTextSimilarity('蝦餃', '虾饺')).toBe(100);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- textSimilarity.test`
Expected: FAIL ("Cannot find module '@/lib/shadowing/normalize'").

- [ ] **Step 7: Create `lib/shadowing/normalize.ts`**

```ts
import * as OpenCC from 'opencc-js';

const toSimplified = OpenCC.Converter({ from: 't', to: 'cn' });

export function normalizeForCompare(text: string): string {
  const simplified = toSimplified(text ?? '');
  // remove all whitespace and punctuation (keep letters/numbers/CJK)
  return simplified.replace(/[\s\p{P}\p{S}]/gu, '');
}
```

- [ ] **Step 8: Create `lib/shadowing/textSimilarity.ts`**

```ts
import { similarityRatio } from './levenshtein';
import { normalizeForCompare } from './normalize';

export function calculateTextSimilarity(text1: string, text2: string): number {
  return similarityRatio(normalizeForCompare(text1), normalizeForCompare(text2));
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- textSimilarity.test`
Expected: PASS (5 tests). If opencc-js import style errors under Vitest, change to `import OpenCC from 'opencc-js'` (default) — verify the converter factory resolves.

- [ ] **Step 10: Commit**

```bash
git add lib/shadowing/levenshtein.ts lib/shadowing/normalize.ts lib/shadowing/textSimilarity.ts lib/shadowing/levenshtein.test.ts lib/shadowing/textSimilarity.test.ts
git commit -m "feat: add Cantonese pronunciation similarity scoring"
```

---

### Task 4: Corpus API client (DimSum 语料库)

**Files:**
- Create: `lib/corpus/types.ts`
- Create: `lib/corpus/client.ts`
- Test: `lib/corpus/client.test.ts`

**Interfaces:**
- Consumes: global `fetch`.
- Produces:
  - `interface CorpusItem { data?: string; note?: { meaning?: string[]; context?: { '粤语文本'?: string; audio?: string } }; structured_note?: { jyutping?: string; data?: { blocks?: Array<{ type?: string; url?: string; audio?: string }> }[] } }`
  - `interface CorpusCard { uuid: string; yueText: string; meanings: string[]; contextText?: string; contextAudio?: string; jyutping?: string; audioUrl?: string }`
  - `async function fetchCorpusItem(uuid: string): Promise<CorpusItem>`
  - `function transformCorpusItem(uuid: string, item: CorpusItem): CorpusCard`. Used by `DishCard` for authentic corpus enrichment.

- [ ] **Step 1: Write the failing test `lib/corpus/client.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCorpusItem, transformCorpusItem } from '@/lib/corpus/client';

afterEach(() => vi.restoreAllMocks());

describe('fetchCorpusItem', () => {
  it('GETs the v2 corpus_item endpoint with the uuid', async () => {
    const json = { data: '蝦餃', note: { meaning: ['shrimp dumpling'] } };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(json) });
    vi.stubGlobal('fetch', fetchMock);

    const item = await fetchCorpusItem('uuid-123');

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('https://backend.aidimsum.com/v2/corpus_item?unique_id=uuid-123');
    expect(item.data).toBe('蝦餃');
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchCorpusItem('missing')).rejects.toThrow();
  });
});

describe('transformCorpusItem', () => {
  it('flattens raw item into a clean CorpusCard', () => {
    const card = transformCorpusItem('uuid-9', {
      data: '蝦餃',
      note: { meaning: ['shrimp dumpling'], context: { '粤语文本': '嚟籠蝦餃', audio: 'http://a/ctx.mp3' } },
      structured_note: {
        jyutping: 'haa1 gaau2',
        data: [{ blocks: [{ type: 'audio', url: 'http://a/word.mp3' }] }],
      },
    });
    expect(card).toEqual({
      uuid: 'uuid-9',
      yueText: '蝦餃',
      meanings: ['shrimp dumpling'],
      contextText: '嚟籠蝦餃',
      contextAudio: 'http://a/ctx.mp3',
      jyutping: 'haa1 gaau2',
      audioUrl: 'http://a/word.mp3',
    });
  });

  it('tolerates missing optional fields', () => {
    const card = transformCorpusItem('u', { data: '茶' });
    expect(card.yueText).toBe('茶');
    expect(card.meanings).toEqual([]);
    expect(card.audioUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- corpus/client.test`
Expected: FAIL ("Cannot find module '@/lib/corpus/client'").

- [ ] **Step 3: Create `lib/corpus/types.ts`**

```ts
export interface CorpusItemBlock {
  type?: string;
  url?: string;
  audio?: string;
}

export interface CorpusItem {
  data?: string;
  note?: {
    meaning?: string[];
    context?: {
      '粤语文本'?: string;
      audio?: string;
    };
  };
  structured_note?: {
    jyutping?: string;
    data?: { blocks?: CorpusItemBlock[] }[];
  };
}

export interface CorpusCard {
  uuid: string;
  yueText: string;
  meanings: string[];
  contextText?: string;
  contextAudio?: string;
  jyutping?: string;
  audioUrl?: string;
}
```

- [ ] **Step 4: Create `lib/corpus/client.ts`**

```ts
import type { CorpusItem, CorpusCard } from './types';

export const CORPUS_API_BASE = 'https://backend.aidimsum.com';

export async function fetchCorpusItem(uuid: string): Promise<CorpusItem> {
  const res = await fetch(`${CORPUS_API_BASE}/v2/corpus_item?unique_id=${encodeURIComponent(uuid)}`);
  if (!res.ok) throw new Error(`Corpus fetch failed: ${res.status}`);
  return (await res.json()) as CorpusItem;
}

function firstAudioBlock(item: CorpusItem): string | undefined {
  const blocks = item.structured_note?.data?.[0]?.blocks ?? [];
  const audio = blocks.find((b) => b.type === 'audio' || b.type === '音频');
  return audio?.url ?? audio?.audio;
}

export function transformCorpusItem(uuid: string, item: CorpusItem): CorpusCard {
  return {
    uuid,
    yueText: item.data ?? '',
    meanings: item.note?.meaning ?? [],
    contextText: item.note?.context?.['粤语文本'],
    contextAudio: item.note?.context?.audio,
    jyutping: item.structured_note?.jyutping,
    audioUrl: firstAudioBlock(item),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- corpus/client.test`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/corpus/
git commit -m "feat: add DimSum corpus item client and transformer"
```

---

### Task 5: Jyutping API client

**Files:**
- Create: `lib/jyutping/client.ts`
- Test: `lib/jyutping/client.test.ts`

**Interfaces:**
- Consumes: global `fetch`, env `NEXT_PUBLIC_API_URL`.
- Produces:
  - `const SHADOWING_API_BASE: string` (`process.env.NEXT_PUBLIC_API_URL ?? 'https://api.shadowing.app.aidimsum.com'`)
  - `async function fetchJyutping(text: string): Promise<string>`. Used by `ShadowingButton`/`DishCard` to get authoritative jyutping.

- [ ] **Step 1: Write the failing test `lib/jyutping/client.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchJyutping } from '@/lib/jyutping/client';

afterEach(() => vi.restoreAllMocks());

describe('fetchJyutping', () => {
  it('POSTs the text and returns content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ content: 'haa1 gaau2' }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJyutping('蝦餃');

    expect(result).toBe('haa1 gaau2');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/to_jyutping');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ text: '蝦餃' });
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchJyutping('x')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- jyutping/client.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `lib/jyutping/client.ts`**

```ts
export const SHADOWING_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.shadowing.app.aidimsum.com';

export async function fetchJyutping(text: string): Promise<string> {
  const res = await fetch(`${SHADOWING_API_BASE}/api/to_jyutping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Jyutping fetch failed: ${res.status}`);
  const data = (await res.json()) as { content?: string };
  return data.content ?? '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- jyutping/client.test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/jyutping/
git commit -m "feat: add jyutping conversion client"
```

---

### Task 6: WAV encoder + transcribe client (record → ASR)

**Files:**
- Create: `lib/shadowing/wavEncoder.ts`
- Create: `lib/shadowing/transcribeApi.ts`
- Test: `lib/shadowing/wavEncoder.test.ts`, `lib/shadowing/transcribeApi.test.ts`

**Interfaces:**
- Consumes: `SHADOWING_API_BASE` from `@/lib/jyutping/client`, Web Audio (`AudioContext`) at runtime, global `fetch`.
- Produces:
  - `function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer` (pure; 16-bit mono PCM WAV)
  - `async function convertBlobToWav(blob: Blob): Promise<Blob>` (uses `AudioContext`; browser-only)
  - `async function transcribeAudioBlob(blob: Blob): Promise<string>`. Used by `ShadowingButton`.

- [ ] **Step 1: Write the failing test `lib/shadowing/wavEncoder.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { encodeWAV } from '@/lib/shadowing/wavEncoder';

function ascii(view: DataView, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

describe('encodeWAV', () => {
  it('writes a valid RIFF/WAVE header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buffer = encodeWAV(samples, 16000);
    const view = new DataView(buffer);
    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(ascii(view, 36, 4)).toBe('data');
    // sample rate at offset 24, little-endian
    expect(view.getUint32(24, true)).toBe(16000);
    // 16-bit mono => byte length = 44 header + samples*2
    expect(buffer.byteLength).toBe(44 + samples.length * 2);
  });

  it('clamps samples to int16 range', () => {
    const buffer = encodeWAV(new Float32Array([2, -2]), 8000);
    const view = new DataView(buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- wavEncoder.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `lib/shadowing/wavEncoder.ts`**

```ts
export function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample; // mono
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }
  return buffer;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- wavEncoder.test`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test `lib/shadowing/transcribeApi.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { transcribeAudioBlob } from '@/lib/shadowing/transcribeApi';

afterEach(() => vi.restoreAllMocks());

describe('transcribeAudioBlob', () => {
  it('POSTs a wav multipart form and returns text', async () => {
    // stub the wav conversion so the test does not need a real AudioContext
    const wav = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
    const mod = await import('@/lib/shadowing/transcribeApi');
    vi.spyOn(mod, 'convertBlobToWav').mockResolvedValue(wav);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ text: '嚟籠蝦餃' }) });
    vi.stubGlobal('fetch', fetchMock);

    const input = new Blob([new Uint8Array([9])], { type: 'audio/webm' });
    const text = await mod.transcribeAudioBlob(input);

    expect(text).toBe('嚟籠蝦餃');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/transcribe');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('throws on non-ok transcription', async () => {
    const mod = await import('@/lib/shadowing/transcribeApi');
    vi.spyOn(mod, 'convertBlobToWav').mockResolvedValue(new Blob([], { type: 'audio/wav' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(mod.transcribeAudioBlob(new Blob([]))).rejects.toThrow();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- transcribeApi.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 7: Create `lib/shadowing/transcribeApi.ts`**

```ts
import { encodeWAV } from './wavEncoder';
import { SHADOWING_API_BASE } from '@/lib/jyutping/client';

export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error('Web Audio API not available');
  const audioContext = new AudioCtx();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const samples = audioBuffer.getChannelData(0);
    const wavBuffer = encodeWAV(samples, audioBuffer.sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } finally {
    void audioContext.close();
  }
}

export async function transcribeAudioBlob(blob: Blob): Promise<string> {
  const wav = await convertBlobToWav(blob);
  const form = new FormData();
  form.append('file', wav, 'audio.wav');
  form.append('task', 'transcribe');
  const res = await fetch(`${SHADOWING_API_BASE}/api/transcribe`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Transcribe failed: ${res.status}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- transcribeApi.test`
Expected: PASS (2 tests). Note: if the spy on an ES module export is disallowed in your Vitest config, refactor `transcribeAudioBlob` to accept an injected converter `transcribeAudioBlob(blob, convert = convertBlobToWav)` and pass the stub in the test.

- [ ] **Step 9: Commit**

```bash
git add lib/shadowing/wavEncoder.ts lib/shadowing/transcribeApi.ts lib/shadowing/wavEncoder.test.ts lib/shadowing/transcribeApi.test.ts
git commit -m "feat: add WAV encoder and ASR transcription client"
```

---

### Task 7: Persona + RAG-lite system prompt builder

**Files:**
- Create: `lib/conversation/types.ts`
- Create: `lib/conversation/persona.ts`
- Create: `lib/conversation/prompt.ts`
- Test: `lib/conversation/prompt.test.ts`

**Interfaces:**
- Consumes: `Dish` from `@/lib/dishes/types`.
- Produces:
  - `interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }`
  - `const PERSONA_NAME = '點心姨'`
  - `const FALLBACK_LINES: string[]`
  - `function buildDishContext(dishes: Dish[]): string`
  - `function buildSystemPrompt(dishes: Dish[]): string`. Used by the chat Route Handler (Task 8) and the engine fallback (Task 9).

- [ ] **Step 1: Write the failing test `lib/conversation/prompt.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prompt.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `lib/conversation/types.ts`**

```ts
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

- [ ] **Step 4: Create `lib/conversation/persona.ts`**

```ts
export const PERSONA_NAME = '點心姨';

export const FALLBACK_LINES = [
  '哎呀,姨我一時聽唔清楚,你再講多次好冇?',
  '唔好意思靚仔,廚房有啲嘈,你想嗌乜嘢茶同點心呀?',
  '得喇得喇,你慢慢揀,睇中邊樣同姨講聲。',
];
```

- [ ] **Step 5: Create `lib/conversation/prompt.ts`**

```ts
import type { Dish } from '@/lib/dishes/types';
import { PERSONA_NAME } from './persona';

export function buildDishContext(dishes: Dish[]): string {
  return dishes
    .map((d) => `- ${d.nameYue}(${d.jyutping}):${d.culturalNote}`)
    .join('\n');
}

export function buildSystemPrompt(dishes: Dish[]): string {
  return [
    `你係香港一間老字號茶樓嘅夥計「${PERSONA_NAME}」,人情味濃、貪玩、鍾意同客人傾偈。`,
    '',
    '【講嘢規矩】',
    '1. 你只可以用地道粵語(粵文書寫),例如:係、唔、嘅、咗、喺、佢、嚟、啲、乜嘢、點解。',
    '2. 唔可以用書面中文(普通話書面語),例如唔好寫「的、了、是、我們、什麼、這個」。',
    '3. 講嘢要簡短自然,好似茶樓夥計咁,一兩句就得,唔好長篇大論。',
    '4. 你只可以介紹同推薦下面呢張餐牌上面有嘅點心,唔好作其他唔存在嘅點心。',
    '5. 客人嗌嘢嘅時候,熱情應一應(例如「好嘞!」),順帶講一兩個關於嗰款點心嘅趣事。',
    '',
    '【今日餐牌(只可以介紹呢啲)】',
    buildDishContext(dishes),
  ].join('\n');
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- prompt.test`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/conversation/types.ts lib/conversation/persona.ts lib/conversation/prompt.ts lib/conversation/prompt.test.ts
git commit -m "feat: add 點心姨 persona and RAG-lite system prompt builder"
```

---

### Task 8: DeepSeek server-side proxy Route Handler

**Files:**
- Create: `lib/conversation/deepseek.ts`
- Create: `app/api/chat/route.ts`
- Test: `app/api/chat/route.test.ts`

**Interfaces:**
- Consumes: `callDeepSeek` + `buildSystemPrompt` + `DISHES` + `ChatMessage`; env `DEEPSEEK_API_BASE_URL`, `DEEPSEEK_API_KEY` (server-only).
- Produces:
  - `async function callDeepSeek(messages: ChatMessage[]): Promise<string>` (server-only; reads env, POSTs `/chat/completions`)
  - `async function POST(req: Request): Promise<Response>` returning `{ reply }` (200) or `{ error }` (400/502). The key is **never** in the response. Consumed by `sendChat` (Task 9).

- [ ] **Step 1: Write the failing test `app/api/chat/route.test.ts`**

```ts
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubEnv('DEEPSEEK_API_BASE_URL', 'https://api.deepseek.test');
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-secret-key');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('POST /api/chat', () => {
  it('injects the system prompt server-side and returns the reply without leaking the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '好嘞!蝦餃即刻嚟。' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '嚟一籠蝦餃' }] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.reply).toBe('好嘞!蝦餃即刻嚟。');
    expect(JSON.stringify(body)).not.toContain('test-secret-key');

    // upstream got system prompt prepended + bearer auth
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.deepseek.test/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-secret-key');
    const sent = JSON.parse(init.body);
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[0].content).toContain('點心姨');
    expect(sent.messages[1]).toEqual({ role: 'user', content: '嚟一籠蝦餃' });
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: 'not-json' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 502 when upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- route.test`
Expected: FAIL ("Cannot find module '@/app/api/chat/route'").

- [ ] **Step 3: Create `lib/conversation/deepseek.ts`**

```ts
import 'server-only';
import type { ChatMessage } from './types';

export async function callDeepSeek(messages: ChatMessage[]): Promise<string> {
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
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}
```

Note: the `server-only` import makes the build fail loudly if any client component ever imports this file — that is the guardrail keeping the key off the browser. If `server-only` is not already present it ships with Next.js; no extra install needed.

- [ ] **Step 4: Create `app/api/chat/route.ts`**

```ts
import { callDeepSeek } from '@/lib/conversation/deepseek';
import { buildSystemPrompt } from '@/lib/conversation/prompt';
import { DISHES } from '@/lib/dishes/data';
import type { ChatMessage } from '@/lib/conversation/types';

export async function POST(req: Request): Promise<Response> {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages)) {
    return Response.json({ error: 'messages_must_be_array' }, { status: 400 });
  }

  const system: ChatMessage = { role: 'system', content: buildSystemPrompt(DISHES) };
  try {
    const reply = await callDeepSeek([system, ...messages]);
    return Response.json({ reply });
  } catch {
    return Response.json({ error: 'upstream_error' }, { status: 502 });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- route.test`
Expected: PASS (3 tests). If Vitest cannot resolve `server-only`, add to `vitest.config.ts` → `test.alias`: `{ 'server-only': fileURLToPath(new URL('./test/stubs/empty.ts', import.meta.url)) }` and create `test/stubs/empty.ts` with `export {};`.

- [ ] **Step 6: Live smoke test against the real DeepSeek API (manual, key not printed)**

```bash
cd /home/stardust/dev/AI-DimSum
npm run dev >/tmp/tan-cha-dev.log 2>&1 &
sleep 6
curl -s -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"你好,我想嗌一籠蝦餃同一壺普洱"}]}'
echo
kill %1 2>/dev/null || true
```

Expected: JSON `{"reply":"...粵文..."}` containing Cantonese particles (嘅/係/嚟). The key is read from `.env.local` server-side and never appears in the response.

- [ ] **Step 7: Commit**

```bash
git add lib/conversation/deepseek.ts app/api/chat/route.ts app/api/chat/route.test.ts
git commit -m "feat: add server-side DeepSeek chat proxy with persona injection"
```

---

### Task 9: Conversation engine (order detection + client sendChat + fallback)

**Files:**
- Create: `lib/conversation/engine.ts`
- Test: `lib/conversation/engine.test.ts`

**Interfaces:**
- Consumes: `Dish`, `ChatMessage`, `FALLBACK_LINES`; global `fetch` (calls own `/api/chat`).
- Produces:
  - `function detectOrderedDishes(userText: string, dishes: Dish[]): Dish[]`
  - `async function sendChat(history: ChatMessage[]): Promise<string>` (POSTs `/api/chat`; on any error returns a random `FALLBACK_LINE` so the UI never dead-ends). Used by `OrderChat`.

- [ ] **Step 1: Write the failing test `lib/conversation/engine.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectOrderedDishes, sendChat } from '@/lib/conversation/engine';
import { FALLBACK_LINES } from '@/lib/conversation/persona';
import { DISHES } from '@/lib/dishes/data';

afterEach(() => vi.restoreAllMocks());

describe('detectOrderedDishes', () => {
  it('matches dishes by Cantonese name', () => {
    const found = detectOrderedDishes('唔該嚟一籠蝦餃同埋燒賣', DISHES);
    expect(found.map((d) => d.id).sort()).toEqual(['har-gow', 'siu-mai']);
  });
  it('matches dishes by Putonghua name', () => {
    const found = detectOrderedDishes('我要虾饺', DISHES);
    expect(found.map((d) => d.id)).toEqual(['har-gow']);
  });
  it('returns empty when nothing matches', () => {
    expect(detectOrderedDishes('你好', DISHES)).toEqual([]);
  });
});

describe('sendChat', () => {
  it('returns the reply on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ reply: '好嘞!' }) }));
    const reply = await sendChat([{ role: 'user', content: '嚟蝦餃' }]);
    expect(reply).toBe('好嘞!');
  });
  it('returns a fallback line on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const reply = await sendChat([{ role: 'user', content: 'x' }]);
    expect(FALLBACK_LINES).toContain(reply);
  });
  it('returns a fallback line on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    const reply = await sendChat([{ role: 'user', content: 'x' }]);
    expect(FALLBACK_LINES).toContain(reply);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- engine.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `lib/conversation/engine.ts`**

```ts
import type { Dish } from '@/lib/dishes/types';
import type { ChatMessage } from './types';
import { FALLBACK_LINES } from './persona';

export function detectOrderedDishes(userText: string, dishes: Dish[]): Dish[] {
  return dishes.filter(
    (d) => userText.includes(d.nameYue) || userText.includes(d.namePutonghua),
  );
}

function randomFallback(): string {
  return FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)];
}

export async function sendChat(history: ChatMessage[]): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error(`chat failed: ${res.status}`);
    const data = (await res.json()) as { reply?: string };
    if (!data.reply) throw new Error('empty reply');
    return data.reply;
  } catch {
    return randomFallback();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- engine.test`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/conversation/engine.ts lib/conversation/engine.test.ts
git commit -m "feat: add conversation engine with order detection and fallback"
```

---

### Task 10: Progression store (Zustand + localStorage persist)

**Files:**
- Create: `lib/store/teahouseStore.ts`
- Test: `lib/store/teahouseStore.test.ts`

**Interfaces:**
- Consumes: `zustand`, `zustand/middleware` (`persist`), `ChatMessage`.
- Produces:
  - `interface TeahouseState { messages: ChatMessage[]; orderedDishIds: string[]; stampedDishIds: string[]; addMessage(m: ChatMessage): void; markOrdered(id: string): void; addStamp(id: string): void; bestScore: number; setBestScore(score: number): void; reset(): void }`
  - `const useTeahouseStore` (zustand hook, persisted under key `tan-cha-store`). Used by `OrderChat`, `StampBook`, `ShareCardButton`.

- [ ] **Step 1: Write the failing test `lib/store/teahouseStore.test.ts`**

```ts
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

  it('dedupes ordered and stamped dish ids', () => {
    const s = useTeahouseStore.getState();
    s.markOrdered('har-gow');
    s.markOrdered('har-gow');
    s.addStamp('har-gow');
    s.addStamp('har-gow');
    expect(useTeahouseStore.getState().orderedDishIds).toEqual(['har-gow']);
    expect(useTeahouseStore.getState().stampedDishIds).toEqual(['har-gow']);
  });

  it('keeps the highest best score only', () => {
    const s = useTeahouseStore.getState();
    s.setBestScore(70);
    s.setBestScore(40);
    expect(useTeahouseStore.getState().bestScore).toBe(70);
    s.setBestScore(95);
    expect(useTeahouseStore.getState().bestScore).toBe(95);
  });

  it('reset clears everything', () => {
    const s = useTeahouseStore.getState();
    s.addMessage({ role: 'user', content: 'x' });
    s.markOrdered('siu-mai');
    s.reset();
    const after = useTeahouseStore.getState();
    expect(after.messages).toEqual([]);
    expect(after.orderedDishIds).toEqual([]);
    expect(after.stampedDishIds).toEqual([]);
    expect(after.bestScore).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- teahouseStore.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `lib/store/teahouseStore.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/lib/conversation/types';

export interface TeahouseState {
  messages: ChatMessage[];
  orderedDishIds: string[];
  stampedDishIds: string[];
  bestScore: number;
  addMessage: (m: ChatMessage) => void;
  markOrdered: (id: string) => void;
  addStamp: (id: string) => void;
  setBestScore: (score: number) => void;
  reset: () => void;
}

export const useTeahouseStore = create<TeahouseState>()(
  persist(
    (set) => ({
      messages: [],
      orderedDishIds: [],
      stampedDishIds: [],
      bestScore: 0,
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      markOrdered: (id) =>
        set((s) => (s.orderedDishIds.includes(id) ? s : { orderedDishIds: [...s.orderedDishIds, id] })),
      addStamp: (id) =>
        set((s) => (s.stampedDishIds.includes(id) ? s : { stampedDishIds: [...s.stampedDishIds, id] })),
      setBestScore: (score) => set((s) => ({ bestScore: Math.max(s.bestScore, score) })),
      reset: () => set({ messages: [], orderedDishIds: [], stampedDishIds: [], bestScore: 0 }),
    }),
    { name: 'tan-cha-store' },
  ),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- teahouseStore.test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/store/
git commit -m "feat: add persisted teahouse progression store"
```

---

### Task 11: Share-card generator ("今日飲茶" canvas)

**Files:**
- Create: `lib/share/shareCard.ts`
- Test: `lib/share/shareCard.test.ts`

**Interfaces:**
- Consumes: `Dish`; runtime `CanvasRenderingContext2D` / `document.createElement('canvas')`.
- Produces:
  - `interface ShareCardData { date: string; dishes: { nameYue: string; emoji: string }[]; bestScore: number }`
  - `function buildShareCardData(input: { dishes: Dish[]; orderedDishIds: string[]; bestScore: number; date?: Date }): ShareCardData`
  - `function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData): void`
  - `async function generateShareCardBlob(data: ShareCardData): Promise<Blob>`. Used by `ShareCardButton`.

- [ ] **Step 1: Write the failing test `lib/share/shareCard.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- shareCard.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `lib/share/shareCard.ts`**

```ts
import type { Dish } from '@/lib/dishes/types';

export interface ShareCardData {
  date: string;
  dishes: { nameYue: string; emoji: string }[];
  bestScore: number;
}

export function buildShareCardData(input: {
  dishes: Dish[];
  orderedDishIds: string[];
  bestScore: number;
  date?: Date;
}): ShareCardData {
  const date = (input.date ?? new Date()).toISOString().slice(0, 10);
  const dishes = input.orderedDishIds
    .map((id) => input.dishes.find((d) => d.id === id))
    .filter((d): d is Dish => Boolean(d))
    .map((d) => ({ nameYue: d.nameYue, emoji: d.emoji }));
  return { date, dishes, bestScore: input.bestScore };
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
  ctx.fillText(`最佳發音 ${data.bestScore} 分`, 48, HEIGHT - 56);
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- shareCard.test`
Expected: PASS (3 tests). `generateShareCardBlob` depends on real canvas `toBlob` (not reliable in jsdom) and is verified manually in the browser at Task 13 — do not unit-test it.

- [ ] **Step 5: Commit**

```bash
git add lib/share/
git commit -m "feat: add 今日飲茶 share-card data and canvas renderer"
```

---

### Task 12: Presentational components — DishCard + StampBook (integration contract)

These are pure render components with **stable class names and props** that open-design re-skins. Logic-free.

**Files:**
- Create: `components/DishCard.tsx`
- Create: `components/StampBook.tsx`
- Test: `components/DishCard.test.tsx`, `components/StampBook.test.tsx`

**Interfaces:**
- Consumes: `Dish` from `@/lib/dishes/types`.
- Produces:
  - `function DishCard(props: { dish: Dish }): JSX.Element` — renders `.dish-name-yue`, `.dish-jyutping`, `.dish-name-alt`, `.dish-note`.
  - `function StampBook(props: { dishes: Dish[]; stampedDishIds: string[] }): JSX.Element` — `<li data-stamped>` per dish, `aria-label="<name> 已蓋章|未蓋章"`. Consumed by `app/page.tsx`.

- [ ] **Step 1: Write the failing test `components/DishCard.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DishCard } from '@/components/DishCard';
import { DISHES } from '@/lib/dishes/data';

describe('DishCard', () => {
  it('renders the dish 粤文 name, jyutping and cultural note', () => {
    const dish = DISHES[0];
    render(<DishCard dish={dish} />);
    expect(screen.getByText(dish.nameYue)).toBeInTheDocument();
    expect(screen.getByText(dish.jyutping)).toBeInTheDocument();
    expect(screen.getByText(dish.culturalNote)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DishCard.test`
Expected: FAIL ("Cannot find module '@/components/DishCard'").

- [ ] **Step 3: Create `components/DishCard.tsx`**

```tsx
import type { Dish } from '@/lib/dishes/types';

export function DishCard({ dish }: { dish: Dish }) {
  return (
    <article className="dish-card" data-dish-id={dish.id}>
      <div className="dish-emoji" aria-hidden>
        {dish.emoji}
      </div>
      <h3 className="dish-name-yue">{dish.nameYue}</h3>
      <p className="dish-jyutping">{dish.jyutping}</p>
      <p className="dish-name-alt">
        {dish.namePutonghua} · {dish.nameEn}
      </p>
      <p className="dish-note">{dish.culturalNote}</p>
    </article>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- DishCard.test`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test `components/StampBook.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StampBook } from '@/components/StampBook';
import { DISHES } from '@/lib/dishes/data';

describe('StampBook', () => {
  it('shows every dish and marks only stamped ones', () => {
    render(<StampBook dishes={DISHES} stampedDishIds={['har-gow']} />);
    for (const d of DISHES) {
      expect(screen.getByText(d.nameYue)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('蝦餃 已蓋章')).toBeInTheDocument();
    expect(screen.getByLabelText('燒賣 未蓋章')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- StampBook.test`
Expected: FAIL ("Cannot find module '@/components/StampBook'").

- [ ] **Step 7: Create `components/StampBook.tsx`**

```tsx
import type { Dish } from '@/lib/dishes/types';

export function StampBook({
  dishes,
  stampedDishIds,
}: {
  dishes: Dish[];
  stampedDishIds: string[];
}) {
  const stamped = new Set(stampedDishIds);
  return (
    <ul className="stamp-book">
      {dishes.map((d) => {
        const got = stamped.has(d.id);
        return (
          <li
            key={d.id}
            className="stamp"
            data-stamped={got}
            aria-label={`${d.nameYue}${got ? ' 已蓋章' : ' 未蓋章'}`}
          >
            <span className="stamp-emoji" aria-hidden>
              {got ? d.emoji : '⚪'}
            </span>
            <span className="stamp-name">{d.nameYue}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- StampBook.test`
Expected: PASS (1 test).

- [ ] **Step 9: Commit**

```bash
git add components/DishCard.tsx components/StampBook.tsx components/DishCard.test.tsx components/StampBook.test.tsx
git commit -m "feat: add DishCard and StampBook presentational components"
```

---

### Task 13: Interactive components + page wiring (OrderChat, ShadowingButton, ShareCardButton, page)

Client components that bind logic to the store. Tests are render smoke tests (the network/MediaRecorder paths are exercised manually at Task 14).

**Files:**
- Create: `components/ShadowingButton.tsx`, `components/OrderChat.tsx`, `components/ShareCardButton.tsx`
- Modify: `app/page.tsx` (replace scaffold default)
- Test: `components/ShadowingButton.test.tsx`, `components/OrderChat.test.tsx`, `components/ShareCardButton.test.tsx`

**Interfaces:**
- Consumes: `transcribeAudioBlob`, `calculateTextSimilarity`, `sendChat`, `detectOrderedDishes`, `useTeahouseStore`, `DISHES`, `buildShareCardData`, `generateShareCardBlob`, `DishCard`, `StampBook`.
- Produces:
  - `interface ShadowingButtonProps { targetPhrase: string; onResult: (score: number, transcript: string) => void }`
  - `function ShadowingButton(props: ShadowingButtonProps): JSX.Element`
  - `function OrderChat(): JSX.Element` (self-contained; reads/writes store)
  - `function ShareCardButton(): JSX.Element`
  - `export default function Page(): JSX.Element` — the assembled teahouse screen open-design re-skins.

- [ ] **Step 1: Write the failing test `components/ShadowingButton.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShadowingButton } from '@/components/ShadowingButton';

describe('ShadowingButton', () => {
  it('renders the target phrase prompt', () => {
    render(<ShadowingButton targetPhrase="唔該嚟一籠蝦餃" onResult={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('唔該嚟一籠蝦餃');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ShadowingButton.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 3: Create `components/ShadowingButton.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { transcribeAudioBlob } from '@/lib/shadowing/transcribeApi';
import { calculateTextSimilarity } from '@/lib/shadowing/textSimilarity';

export interface ShadowingButtonProps {
  targetPhrase: string;
  onResult: (score: number, transcript: string) => void;
}

export function ShadowingButton({ targetPhrase, onResult }: ShadowingButtonProps) {
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
        const score = calculateTextSimilarity(transcript, targetPhrase);
        onResult(score, transcript);
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
      className="shadowing-button"
      data-recording={recording}
      disabled={busy}
      onClick={recording ? stop : start}
    >
      {busy ? '評緊分…' : recording ? '停止錄音' : `跟讀:${targetPhrase}`}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ShadowingButton.test`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test `components/OrderChat.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderChat } from '@/components/OrderChat';
import { useTeahouseStore } from '@/lib/store/teahouseStore';

beforeEach(() => useTeahouseStore.getState().reset());

describe('OrderChat', () => {
  it('renders an input to talk to 點心姨', () => {
    render(<OrderChat />);
    expect(screen.getByPlaceholderText(/點心姨/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- OrderChat.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 7: Create `components/OrderChat.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { sendChat, detectOrderedDishes } from '@/lib/conversation/engine';
import { DISHES } from '@/lib/dishes/data';

export function OrderChat() {
  const messages = useTeahouseStore((s) => s.messages);
  const addMessage = useTeahouseStore((s) => s.addMessage);
  const markOrdered = useTeahouseStore((s) => s.markOrdered);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setInput('');
    addMessage({ role: 'user', content: text });
    detectOrderedDishes(text, DISHES).forEach((d) => markOrdered(d.id));
    setPending(true);
    const history = [...useTeahouseStore.getState().messages];
    const reply = await sendChat(history);
    addMessage({ role: 'assistant', content: reply });
    setPending(false);
  }

  return (
    <section className="order-chat">
      <ul className="order-chat-messages">
        {messages.map((m, i) => (
          <li key={i} className={`msg msg-${m.role}`}>
            {m.content}
          </li>
        ))}
      </ul>
      <form className="order-chat-form" onSubmit={submit}>
        <input
          className="order-chat-input"
          placeholder="同點心姨講…(例如:唔該嚟一籠蝦餃)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={pending}>
          {pending ? '…' : '嗌'}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- OrderChat.test`
Expected: PASS (1 test).

- [ ] **Step 9: Write the failing test `components/ShareCardButton.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareCardButton } from '@/components/ShareCardButton';
import { useTeahouseStore } from '@/lib/store/teahouseStore';

beforeEach(() => useTeahouseStore.getState().reset());

describe('ShareCardButton', () => {
  it('renders the share action', () => {
    render(<ShareCardButton />);
    expect(screen.getByRole('button')).toHaveTextContent('今日飲茶');
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- ShareCardButton.test`
Expected: FAIL ("Cannot find module").

- [ ] **Step 11: Create `components/ShareCardButton.tsx`**

```tsx
'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { buildShareCardData, generateShareCardBlob } from '@/lib/share/shareCard';

export function ShareCardButton() {
  const orderedDishIds = useTeahouseStore((s) => s.orderedDishIds);
  const bestScore = useTeahouseStore((s) => s.bestScore);

  async function download() {
    const data = buildShareCardData({ dishes: DISHES, orderedDishIds, bestScore });
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

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- ShareCardButton.test`
Expected: PASS (1 test).

- [ ] **Step 13: Replace `app/page.tsx` with the assembled screen**

```tsx
'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { OrderChat } from '@/components/OrderChat';
import { StampBook } from '@/components/StampBook';
import { ShareCardButton } from '@/components/ShareCardButton';
import { ShadowingButton } from '@/components/ShadowingButton';
import { DishCard } from '@/components/DishCard';

export default function Page() {
  const stampedDishIds = useTeahouseStore((s) => s.stampedDishIds);
  const setBestScore = useTeahouseStore((s) => s.setBestScore);
  const addStamp = useTeahouseStore((s) => s.addStamp);

  return (
    <main className="teahouse">
      <h1>叹茶 · 虛擬茶樓</h1>
      <OrderChat />
      <section className="shadowing-practice">
        <h2>跟讀練習</h2>
        {DISHES.map((d) => (
          <div key={d.id} className="practice-row">
            <DishCard dish={d} />
            <ShadowingButton
              targetPhrase={d.orderPhrase}
              onResult={(score) => {
                setBestScore(score);
                if (score >= 70) addStamp(d.id);
              }}
            />
          </div>
        ))}
      </section>
      <StampBook dishes={DISHES} stampedDishIds={stampedDishIds} />
      <ShareCardButton />
    </main>
  );
}
```

- [ ] **Step 14: Run the full test suite + production build**

Run: `npm test && npm run build`
Expected: all tests PASS; `next build` completes with no type errors. The `build` step is what proves `server-only` is correctly isolated — if any client component imported `lib/conversation/deepseek.ts`, the build fails here.

- [ ] **Step 15: Commit**

```bash
git add components/ShadowingButton.tsx components/OrderChat.tsx components/ShareCardButton.tsx app/page.tsx components/ShadowingButton.test.tsx components/OrderChat.test.tsx components/ShareCardButton.test.tsx
git commit -m "feat: wire interactive teahouse components and home page"
```

---

### Task 14: Env example, integration contract doc, and manual E2E checklist

Closes the loop: documents the styling/props contract open-design consumes, the env vars, and a manual run-through that exercises the network + audio paths the unit tests stub.

**Files:**
- Create: `.env.local.example`
- Create: `docs/INTEGRATION.md`
- Modify: `README.md` (append a "Run" section)

**Interfaces:**
- Consumes: every component/lib produced above (documentation only — no new code).
- Produces: the human-facing contract. No exported symbols.

- [ ] **Step 1: Create `.env.local.example` (names only — never copy the real secret here)**

```bash
# DeepSeek (server-side only — NEVER prefix with NEXT_PUBLIC_)
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your-deepseek-key-here

# DimSum shadowing service base (public). Defaults to the prod host if unset.
NEXT_PUBLIC_API_URL=https://api.shadowing.app.aidimsum.com
```

- [ ] **Step 2: Create `docs/INTEGRATION.md` (the open-design contract)**

````markdown
# 前端整合契約 (for open-design re-skinning)

逻辑、数据、API 已完成。视觉设计用 open-design 产出后,按下表把样式套到对应组件 / class 上即可,**唔好改动 props 同 class 名**(否则会断开逻辑)。

## 组件清单与 props

| 组件 | Props | 作用 | 可套样式的 class |
|---|---|---|---|
| `OrderChat` | 无(自接 store) | 同點心姨对话、自动记录已点点心 | `.order-chat`, `.order-chat-messages`, `.msg-user`, `.msg-assistant`, `.order-chat-form`, `.order-chat-input` |
| `ShadowingButton` | `{ targetPhrase: string; onResult(score, transcript): void }` | 录音→ASR→打分 | `.shadowing-button`, `[data-recording]` |
| `DishCard` | `{ dish: Dish }` | 单个点心:粤文/粤拼/文化注解 | `.dish-card`, `.dish-name-yue`, `.dish-jyutping`, `.dish-name-alt`, `.dish-note` |
| `StampBook` | `{ dishes: Dish[]; stampedDishIds: string[] }` | 集章册 | `.stamp-book`, `.stamp`, `[data-stamped]` |
| `ShareCardButton` | 无(自接 store) | 生成「今日飲茶」分享卡 png | `.share-card-button` |

## 数据流

1. 用户喺 `OrderChat` 输入粤语 → `addMessage` 入 store → `detectOrderedDishes` 比对 `DISHES` → `markOrdered`。
2. `sendChat` POST `/api/chat`(server 端注入 點心姨 人设 + 餐牌做 RAG-lite)→ DeepSeek `deepseek-chat` → 回粤文。
3. `ShadowingButton` 录音 → `transcribeAudioBlob`(DimSum ASR)→ `calculateTextSimilarity` 打 0–100 分;≥70 触发 `addStamp`,`setBestScore` 留最高分。
4. `ShareCardButton` 用 store 状态 `buildShareCardData` → canvas 画卡 → 下载。

## 关键约束

- `DEEPSEEK_API_KEY` 只喺 `lib/conversation/deepseek.ts`(`server-only`)同 `app/api/chat/route.ts` 出现,**永不入浏览器**。唔好喺任何 client 组件 import 呢个文件。
- 点心数据单一来源:`lib/dishes/data.ts` 嘅 `DISHES`。加点心淨係改呢度。
- 集章合格线 70 分喺 `app/page.tsx` 嘅 `onResult` 入面。
````

- [ ] **Step 3: Append a "Run" section to `README.md`**

````markdown
## Run（叹茶·虚拟茶楼）

```bash
cp .env.local.example .env.local   # 填入真实 DEEPSEEK_API_KEY（已 gitignore）
npm install
npm run dev                        # http://localhost:3000
npm test                           # 单元测试
npm run build                      # 类型检查 + server-only 隔离校验
```

前端视觉由 open-design 产出后套用,契约见 `docs/INTEGRATION.md`。
````

- [ ] **Step 4: Manual end-to-end checklist (run `npm run dev`, real `.env.local` in place)**

Verify each — these cover the live paths unit tests stub:

- [ ] 输入「唔該嚟一籠蝦餃同一壺普洱」→ 點心姨回**粤文**(有 嘅/係/嚟 等粤语字),唔系普通话书面语。
- [ ] 蝦餃 喺集章册标记为「已点」(`detectOrderedDishes` 生效)。
- [ ] 撳 `ShadowingButton` 录「唔該嚟一籠蝦餃」→ 见到分数;讲得准 ≥70 → 该点心盖章。
- [ ] 断网或令 `/api/chat` 失败 → 對話仍回 fallback 粤语句,唔会卡死。
- [ ] 撳「生成今日飲茶分享卡」→ 下载到一张列出已点点心 + 最佳分数嘅 png。
- [ ] 刷新页面 → 已点 / 盖章 / 最佳分数 仍在(localStorage persist)。
- [ ] 浏览器 DevTools → Network 同 Sources 搜 `DEEPSEEK_API_KEY` 同 key 片段 → **搜唔到**(确认 key 无泄漏到前端)。

- [ ] **Step 5: Commit**

```bash
git add .env.local.example docs/INTEGRATION.md README.md
git status --short | grep -q '^A  .env.local$' && echo "DANGER: real .env.local staged — unstage it" && exit 1
git commit -m "docs: add env example, integration contract, and run guide"
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-06-25-tan-cha-teahouse-design.md` MVP):

| Spec MVP item | Task(s) |
|---|---|
| 1 茶楼场景 / 1 角色(點心姨) | 7 (persona), 13 (page) |
| 8–12 点心(粤文+粤拼+文化) | 2 (10 dishes), 12 (DishCard) |
| 文字点单对话(RAG-lite) | 7 (prompt), 8 (proxy), 9 (engine), 13 (OrderChat) |
| 关键句跟读打分 | 3 (similarity), 6 (WAV+ASR), 13 (ShadowingButton) |
| 集章册进度 | 10 (store), 12 (StampBook) |
| 今日饮茶分享卡 | 11 (shareCard), 13 (ShareCardButton) |
| DeepSeek server-side only / key 不泄漏 | 8 (server-only + route), 14 (Network 校验) |
| 真实 DimSum 数据(corpus/jyutping/ASR) | 4, 5, 6 |
| 前端视觉交由 open-design | Out of scope; contract in 14 (`docs/INTEGRATION.md`) |

No MVP gap. Out-of-scope (later/visual) items intentionally excluded per the user's open-design decision.

**2. Placeholder scan:** No "TBD"/"implement later"/"add error handling"-style placeholders. Every code step shows full file contents; every test step shows full test code; every command shows the expected result.

**3. Type consistency** (names verified identical across tasks):
- `Dish` / `DishCategory` (T2) used unchanged in T7, T11, T12, T13.
- `ChatMessage` (T7) used in T8, T9, T10.
- `calculateTextSimilarity` (T3) called in T13 `ShadowingButton`.
- `transcribeAudioBlob` (T6) called in T13.
- `buildSystemPrompt(dishes)` (T7) called in T8 route.
- `callDeepSeek(messages)` (T8) — server-only, only referenced by the route.
- `sendChat` / `detectOrderedDishes` (T9) called in T13 `OrderChat`.
- `useTeahouseStore` selectors `messages/orderedDishIds/stampedDishIds/bestScore/addMessage/markOrdered/addStamp/setBestScore/reset` (T10) — every selector used in T12/T13 exists on the interface.
- `buildShareCardData` / `generateShareCardBlob` (T11) called in T13 `ShareCardButton`; `ShareCardData` shape matches `drawShareCard`.
- `SHADOWING_API_BASE` defined in T5, imported by T6 — single source, no divergence.

Consistent.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-25-tan-cha-teahouse.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
