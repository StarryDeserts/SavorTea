# BYOK 设置页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加一个 `/settings` 页让用户填自己的 OpenAI 兼容 `{baseURL, apiKey, model}`,浏览器直连该 provider 取风味,host 额度不再被烧。

**Architecture:** `checkOrder`(确定性判定)不变。只在"取风味"分叉:有用户 config → 浏览器直连 provider;无 config → 现有 `/api/chat`。用户 key 只存 localStorage、只发往用户选的 provider,绝不经过本站服务器。任何失败冒泡到 `OrderChat` 既有 catch → `buildJudgeFallback`,游戏不断。

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Zustand ^5 + persist · Vitest 4 + @testing-library/react (jsdom)。

## Global Constraints

- 新依赖**无**。
- `checkOrder` 与游戏 store(`tan-cha-store` v1)**一律不改**。
- 设置 store 与游戏 store **分开**:新 persist key `tan-cha-llm`(v1)。
- **安全红线**:用户 key 只存浏览器 localStorage、只发往用户选的 provider;**永不**发往 `/api/chat`、**永不** log、**永不**进任何响应体。`judgeOrder` 带 config 时**绝不** `fetch('/api/chat')`(单测断言)。
- 产品/界面文案用地道粤文(係/唔/嘅/咗/喺/嚟/俾);技术术语(baseURL、model、API Key)保留原词。
- 设置页/状态指示**纯语义 class**(无 Tailwind 工具类),视觉皮肤归 open-design。
- `/api/chat` + server-only `deepseek.ts` 保留;`DEEPSEEK_API_KEY` 仍只在 server 端,其 `not.toContain('test-secret-key')` 断言不变。
- 每个任务结束 `npx tsc --noEmit` GREEN,`npm test` 全绿。

---

### Task 1: 设置数据层(providers + llmConfig + store)

**Files:**
- Create: `lib/settings/providers.ts` + `lib/settings/providers.test.ts`
- Create: `lib/settings/llmConfig.ts` + `lib/settings/llmConfig.test.ts`
- Create: `lib/settings/llmConfigStore.ts` + `lib/settings/llmConfigStore.test.ts`

**Interfaces:**
- Consumes: `zustand`、`zustand/middleware`(见 `lib/store/teahouseStore.ts` 用法)。
- Produces:
  - `ProviderPreset { id; label; baseURL; defaultModel }`;`PROVIDER_PRESETS: ProviderPreset[]`;`providerLabel(id: string): string`。
  - `LlmConfig { provider; baseURL; apiKey; model }`;`hasLlmConfig(c: LlmConfig): boolean`。
  - `useLlmConfigStore`(state = `LlmConfig` + `setConfig(p: Partial<LlmConfig>)` + `clear()`),persist key `tan-cha-llm`。

- [ ] **Step 1: providers 失败测试**

`lib/settings/providers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PROVIDER_PRESETS, providerLabel } from '@/lib/settings/providers';

describe('providers', () => {
  it('includes the DeepSeek preset with its base URL and model', () => {
    const ds = PROVIDER_PRESETS.find((p) => p.id === 'deepseek')!;
    expect(ds.baseURL).toBe('https://api.deepseek.com');
    expect(ds.defaultModel).toBe('deepseek-chat');
  });

  it('has an empty custom preset and resolves labels by id', () => {
    const custom = PROVIDER_PRESETS.find((p) => p.id === 'custom')!;
    expect(custom.baseURL).toBe('');
    expect(custom.defaultModel).toBe('');
    expect(providerLabel('deepseek')).toBe('DeepSeek');
    expect(providerLabel('unknown')).toBe('unknown');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run lib/settings/providers.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/settings/providers"`。

- [ ] **Step 3: 写 providers**

`lib/settings/providers.ts`:

```ts
export interface ProviderPreset {
  id: string;
  label: string;
  baseURL: string;
  defaultModel: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'deepseek', label: 'DeepSeek', baseURL: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  { id: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
  { id: 'moonshot', label: 'Moonshot', baseURL: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  { id: 'qwen', label: '通义(DashScope)', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus' },
  { id: 'custom', label: '自定义', baseURL: '', defaultModel: '' },
];

export function providerLabel(id: string): string {
  return PROVIDER_PRESETS.find((p) => p.id === id)?.label ?? id;
}
```

- [ ] **Step 4: llmConfig 失败测试**

`lib/settings/llmConfig.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hasLlmConfig } from '@/lib/settings/llmConfig';

describe('hasLlmConfig', () => {
  it('is true only when baseURL, apiKey and model are all set', () => {
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: 'https://x', apiKey: 'k', model: 'm' })).toBe(true);
  });

  it('is false when any of baseURL/apiKey/model is empty', () => {
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: '', apiKey: 'k', model: 'm' })).toBe(false);
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: 'https://x', apiKey: '', model: 'm' })).toBe(false);
    expect(hasLlmConfig({ provider: 'deepseek', baseURL: 'https://x', apiKey: 'k', model: '' })).toBe(false);
  });
});
```

- [ ] **Step 5: 跑测试确认失败**

Run: `npx vitest run lib/settings/llmConfig.test.ts`
Expected: FAIL — import 解析失败。

- [ ] **Step 6: 写 llmConfig**

`lib/settings/llmConfig.ts`:

```ts
export interface LlmConfig {
  provider: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

export function hasLlmConfig(c: LlmConfig): boolean {
  return Boolean(c.baseURL && c.apiKey && c.model);
}
```

- [ ] **Step 7: store 失败测试**

`lib/settings/llmConfigStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';

beforeEach(() => useLlmConfigStore.getState().clear());

describe('useLlmConfigStore', () => {
  it('persists under the tan-cha-llm key and starts with the DeepSeek preset and empty key', () => {
    expect(useLlmConfigStore.persist.getOptions().name).toBe('tan-cha-llm');
    const s = useLlmConfigStore.getState();
    expect(s.provider).toBe('deepseek');
    expect(s.baseURL).toBe('https://api.deepseek.com');
    expect(s.model).toBe('deepseek-chat');
    expect(s.apiKey).toBe('');
  });

  it('merges partial config and clears back to defaults', () => {
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user', provider: 'openai' });
    expect(useLlmConfigStore.getState().apiKey).toBe('sk-user');
    expect(useLlmConfigStore.getState().provider).toBe('openai');
    useLlmConfigStore.getState().clear();
    expect(useLlmConfigStore.getState().apiKey).toBe('');
    expect(useLlmConfigStore.getState().provider).toBe('deepseek');
  });
});
```

- [ ] **Step 8: 跑测试确认失败**

Run: `npx vitest run lib/settings/llmConfigStore.test.ts`
Expected: FAIL — import 解析失败。

- [ ] **Step 9: 写 store**

`lib/settings/llmConfigStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LlmConfig } from './llmConfig';
import { PROVIDER_PRESETS } from './providers';

const deepseek = PROVIDER_PRESETS[0];

const initial: LlmConfig = {
  provider: deepseek.id,
  baseURL: deepseek.baseURL,
  apiKey: '',
  model: deepseek.defaultModel,
};

interface LlmConfigState extends LlmConfig {
  setConfig: (partial: Partial<LlmConfig>) => void;
  clear: () => void;
}

export const useLlmConfigStore = create<LlmConfigState>()(
  persist(
    (set) => ({
      ...initial,
      setConfig: (partial) => set((s) => ({ ...s, ...partial })),
      clear: () => set({ ...initial }),
    }),
    { name: 'tan-cha-llm', version: 1 },
  ),
);
```

- [ ] **Step 10: 三个测试通过 + tsc + 提交**

```bash
npx vitest run lib/settings/providers.test.ts lib/settings/llmConfig.test.ts lib/settings/llmConfigStore.test.ts
npx tsc --noEmit
git add lib/settings/
git commit -m "feat: add settings data layer (providers, llmConfig, persisted store)"
```

---

### Task 2: `postChatCompletions`(OpenAI 兼容客户端调用)

**Files:**
- Create: `lib/conversation/openaiCompatible.ts` + `lib/conversation/openaiCompatible.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` from `@/lib/conversation/types`。
- Produces: `postChatCompletions({ baseURL, apiKey, model, messages, jsonMode? }): Promise<string>` —— POST `${baseURL}/chat/completions`,`Bearer apiKey`,`!ok` 抛错,返回 `choices[0].message.content ?? ''`。**非 server-only**(两端共用)。

- [ ] **Step 1: 写失败测试**

`lib/conversation/openaiCompatible.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { postChatCompletions } from '@/lib/conversation/openaiCompatible';

afterEach(() => vi.restoreAllMocks());

describe('postChatCompletions', () => {
  it('posts to {baseURL}/chat/completions with bearer auth and returns content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'hello' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const out = await postChatCompletions({
      baseURL: 'https://prov.test',
      apiKey: 'sk-user',
      model: 'm-1',
      messages: [{ role: 'user', content: 'hi' }],
      jsonMode: true,
    });

    expect(out).toBe('hello');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://prov.test/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-user');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe('m-1');
    expect(sent.response_format).toEqual({ type: 'json_object' });
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(
      postChatCompletions({ baseURL: 'https://prov.test', apiKey: 'k', model: 'm', messages: [] }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run lib/conversation/openaiCompatible.test.ts`
Expected: FAIL — import 解析失败。

- [ ] **Step 3: 写实现**

`lib/conversation/openaiCompatible.ts`:

```ts
import type { ChatMessage } from './types';

export async function postChatCompletions(opts: {
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
}): Promise<string> {
  const res = await fetch(`${opts.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: 0.8,
      max_tokens: 400,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`chat error ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}
```

- [ ] **Step 4: 测试通过 + tsc + 提交**

```bash
npx vitest run lib/conversation/openaiCompatible.test.ts
npx tsc --noEmit
git add lib/conversation/openaiCompatible.ts lib/conversation/openaiCompatible.test.ts
git commit -m "feat: add OpenAI-compatible postChatCompletions client"
```

---

### Task 3: `deepseek.ts` 委托给 `postChatCompletions`(行为不变重构)

**Files:**
- Modify: `lib/conversation/deepseek.ts`

**Interfaces:**
- Consumes: `postChatCompletions`(Task 2)。
- Produces: `callDeepSeek(messages, opts?)` 签名/行为不变,内部改为读 env 后委托。

> **为何无新测试:** 这是行为保持的重构。它的回归网是现有 `app/api/chat/route.test.ts`(mock fetch,断言 `https://api.deepseek.test/chat/completions`、`Bearer test-secret-key`、`response_format`、不泄漏 key)—— `postChatCompletions` 产出同样的请求,所以这些断言必须保持绿。

- [ ] **Step 1: 改写 `deepseek.ts`**

`lib/conversation/deepseek.ts`:

```ts
import 'server-only';
import type { ChatMessage } from './types';
import { postChatCompletions } from './openaiCompatible';

export async function callDeepSeek(
  messages: ChatMessage[],
  opts?: { jsonMode?: boolean },
): Promise<string> {
  const baseURL = process.env.DEEPSEEK_API_BASE_URL;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!baseURL || !apiKey) throw new Error('DeepSeek env not configured');
  return postChatCompletions({ baseURL, apiKey, model: 'deepseek-chat', messages, jsonMode: opts?.jsonMode });
}
```

- [ ] **Step 2: 跑路由回归 —— 必须全绿**

Run: `npx vitest run app/api/chat/route.test.ts`
Expected: PASS（全部 6 个用例;请求形状与 key 不泄漏断言不变）。

- [ ] **Step 3: tsc + 提交**

```bash
npx tsc --noEmit
git add lib/conversation/deepseek.ts
git commit -m "refactor: callDeepSeek delegates to postChatCompletions (behavior preserved)"
```

---

### Task 4: `judgeOrder` 判定分叉(BYOK 直连 / 无 config 走 /api/chat)

**Files:**
- Modify: `lib/conversation/engine.ts`
- Modify: `lib/conversation/engine.test.ts`(加 BYOK 用例)

**Interfaces:**
- Consumes: `LlmConfig` + `hasLlmConfig`(Task 1);`postChatCompletions`(Task 2);`buildJudgePrompt`(`./prompt`);`parseJudgeContent`(`./judge`);`DISHES`。
- Produces: `judgeOrder(input: {dishId; transcript; pass}, llmConfig?: LlmConfig): Promise<JudgeResult>`。有 config → 直连 provider;无 config → `/api/chat`。**自身不兜底,失败一律抛错**(由 OrderChat 兜底)。

- [ ] **Step 1: 加 BYOK 失败测试(保留现有两个用例)**

把 `lib/conversation/engine.test.ts` 整个替换为:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { judgeOrder } from '@/lib/conversation/engine';

afterEach(() => vi.restoreAllMocks());

const CONFIG = { provider: 'deepseek', baseURL: 'https://prov.test', apiKey: 'sk-user', model: 'deepseek-chat' };

describe('judgeOrder', () => {
  it('POSTs the judge body to /api/chat when no LLM config is set', async () => {
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

  it('throws on a non-ok /api/chat response so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false })).rejects.toThrow();
  });

  it('with config, calls the provider directly with the user key and NEVER /api/chat', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{"reply":"好嘞!","stars":3,"tip":"好"}' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await judgeOrder({ dishId: 'har-gow', transcript: '唔該嚟一籠蝦餃', pass: true }, CONFIG);
    expect(result).toEqual({ reply: '好嘞!', stars: 3, tip: '好' });

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain('https://prov.test/chat/completions');
    expect(urls).not.toContain('/api/chat'); // key 不经本站服务器
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-user');
  });

  it('with config, throws when the provider returns unparseable content (OrderChat falls back)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'not json' } }] }),
    }));
    await expect(
      judgeOrder({ dishId: 'har-gow', transcript: 'x', pass: false }, CONFIG),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 跑测试确认新用例失败**

Run: `npx vitest run lib/conversation/engine.test.ts`
Expected: 前两个 PASS（现行为）;后两个 FAIL（`judgeOrder` 还不接受/不处理 config）。

- [ ] **Step 3: 改写 `engine.ts`**

`lib/conversation/engine.ts`:

```ts
import type { JudgeResult } from './judge';
import { parseJudgeContent } from './judge';
import type { LlmConfig } from '@/lib/settings/llmConfig';
import { hasLlmConfig } from '@/lib/settings/llmConfig';
import { DISHES } from '@/lib/dishes/data';
import { buildJudgePrompt } from './prompt';
import { postChatCompletions } from './openaiCompatible';
import type { ChatMessage } from './types';

export async function judgeOrder(
  input: { dishId: string; transcript: string; pass: boolean },
  llmConfig?: LlmConfig,
): Promise<JudgeResult> {
  if (llmConfig && hasLlmConfig(llmConfig)) {
    const dish = DISHES.find((d) => d.id === input.dishId);
    if (!dish) throw new Error(`unknown dish: ${input.dishId}`);
    const messages: ChatMessage[] = [
      { role: 'system', content: buildJudgePrompt(dish, input.transcript, input.pass) },
      { role: 'user', content: input.transcript },
    ];
    const content = await postChatCompletions({
      baseURL: llmConfig.baseURL,
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      messages,
      jsonMode: true,
    });
    const parsed = parseJudgeContent(content);
    if (!parsed) throw new Error('judge parse failed');
    return parsed;
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`judge failed: ${res.status}`);
  return (await res.json()) as JudgeResult;
}
```

- [ ] **Step 4: 测试全绿 + tsc + 提交**

Run: `npx vitest run lib/conversation/engine.test.ts`
Expected: PASS（4/4）。

```bash
npx tsc --noEmit
git add lib/conversation/engine.ts lib/conversation/engine.test.ts
git commit -m "feat: judgeOrder forks to direct provider call when user config is set"
```

---

### Task 5: `OrderChat` 注入用户 config

**Files:**
- Modify: `components/OrderChat.tsx`
- Modify: `components/OrderChat.test.tsx`(加 forward 用例)

**Interfaces:**
- Consumes: `useLlmConfigStore`(Task 1);`judgeOrder(input, llmConfig?)`(Task 4)。
- Produces: 无下游;`attempt()` 取用时读 `useLlmConfigStore.getState()` 传入 `judgeOrder`。

- [ ] **Step 1: 替换 `OrderChat.test.tsx`(保留现有 3 个用例 + 加 forward)**

`components/OrderChat.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderChat } from '@/components/OrderChat';
import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { DISHES } from '@/lib/dishes/data';

vi.mock('@/lib/conversation/engine', () => ({
  judgeOrder: vi.fn().mockResolvedValue({ reply: '好嘞!', stars: 3, tip: '' }),
}));
import { judgeOrder } from '@/lib/conversation/engine';

beforeEach(() => {
  useTeahouseStore.getState().reset();
  useLlmConfigStore.getState().clear();
  vi.mocked(judgeOrder).mockClear();
});

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

  it('forwards the saved LLM config to judgeOrder on submit', async () => {
    useLlmConfigStore.getState().setConfig({ baseURL: 'https://prov.test', apiKey: 'sk-user', model: 'deepseek-chat' });
    render(<OrderChat />);
    fireEvent.change(screen.getByPlaceholderText(/點心姨/), { target: { value: DISHES[0].task.hint } });
    fireEvent.click(screen.getByRole('button', { name: '嗌' }));
    await waitFor(() => expect(judgeOrder).toHaveBeenCalled());
    expect(vi.mocked(judgeOrder).mock.calls[0][1]).toMatchObject({
      baseURL: 'https://prov.test',
      apiKey: 'sk-user',
      model: 'deepseek-chat',
    });
  });
});
```

- [ ] **Step 2: 跑测试确认 forward 用例失败**

Run: `npx vitest run components/OrderChat.test.tsx`
Expected: 前 3 个 PASS;forward 用例 FAIL（`judgeOrder` 收到的第二参数还是 `undefined`）。

- [ ] **Step 3: 改 `OrderChat.tsx`**

加 import:

```tsx
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
```

把 `attempt` 里这段:

```tsx
    let judge: JudgeResult;
    try {
      judge = await judgeOrder({ dishId: dish.id, transcript: text, pass });
    } catch {
```

改为:

```tsx
    const llmConfig = useLlmConfigStore.getState();
    let judge: JudgeResult;
    try {
      judge = await judgeOrder({ dishId: dish.id, transcript: text, pass }, llmConfig);
    } catch {
```

- [ ] **Step 4: 测试全绿 + tsc + 提交**

Run: `npx vitest run components/OrderChat.test.tsx`
Expected: PASS（4/4）。

```bash
npx tsc --noEmit
git add components/OrderChat.tsx components/OrderChat.test.tsx
git commit -m "feat: OrderChat injects the saved LLM config into judgeOrder"
```

---

### Task 6: `/settings` 设置页

**Files:**
- Create: `app/settings/page.tsx` + `app/settings/page.test.tsx`

**Interfaces:**
- Consumes: `useLlmConfigStore`(Task 1)、`PROVIDER_PRESETS`(Task 1)、`postChatCompletions`(Task 2)、`next/link`。
- Produces: `/settings` 路由。class:`.settings` / `.settings-privacy` / `.settings-field` / `.settings-label` / `.settings-provider-select` / `.settings-input` / `.settings-actions` / `.settings-test-button` / `.settings-test-result`(`data-state`)。

- [ ] **Step 1: 写失败测试**

`app/settings/page.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';

beforeEach(() => useLlmConfigStore.getState().clear());
afterEach(() => vi.restoreAllMocks());

describe('SettingsPage', () => {
  it('renders the key field and the privacy note', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/只存喺你部機/)).toBeInTheDocument();
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('fills baseURL and model when a preset is chosen', () => {
    render(<SettingsPage />);
    fireEvent.change(document.querySelector('.settings-provider-select')!, { target: { value: 'openai' } });
    const baseURL = screen.getByDisplayValue('https://api.openai.com/v1');
    expect(baseURL).toBeInTheDocument();
    expect(screen.getByDisplayValue('gpt-4o-mini')).toBeInTheDocument();
  });

  it('shows a success state when the connection test resolves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    }));
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user' });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('測試連接'));
    await waitFor(() => expect(screen.getByText('通咗,可以用')).toBeInTheDocument());
  });

  it('shows a failure state when the connection test rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user' });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('測試連接'));
    await waitFor(() => expect(screen.getByText(/連唔到/)).toBeInTheDocument());
  });

  it('clears the key', () => {
    useLlmConfigStore.getState().setConfig({ apiKey: 'sk-user' });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('清除 key'));
    expect(useLlmConfigStore.getState().apiKey).toBe('');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run app/settings/page.test.tsx`
Expected: FAIL — import 解析失败。

- [ ] **Step 3: 写设置页**

`app/settings/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { PROVIDER_PRESETS } from '@/lib/settings/providers';
import { postChatCompletions } from '@/lib/conversation/openaiCompatible';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

export default function SettingsPage() {
  const { provider, baseURL, apiKey, model, setConfig, clear } = useLlmConfigStore();
  const [test, setTest] = useState<TestState>('idle');

  function onPreset(id: string) {
    const preset = PROVIDER_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (id === 'custom') setConfig({ provider: id });
    else setConfig({ provider: id, baseURL: preset.baseURL, model: preset.defaultModel });
  }

  async function testConnection() {
    setTest('testing');
    try {
      await postChatCompletions({ baseURL, apiKey, model, messages: [{ role: 'user', content: 'ping' }] });
      setTest('ok');
    } catch {
      setTest('fail');
    }
  }

  return (
    <main className="settings">
      <h1>設定 · API Key</h1>
      <p className="settings-privacy">
        你嘅 API key 只存喺你部機,直連你揀嘅 provider,唔會經過我哋嘅伺服器、唔會上傳、唔會 log。
      </p>

      <label className="settings-field">
        <span className="settings-label">供應商</span>
        <select className="settings-provider-select" value={provider} onChange={(e) => onPreset(e.target.value)}>
          {PROVIDER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>

      <label className="settings-field">
        <span className="settings-label">接口地址 baseURL</span>
        <input className="settings-input" value={baseURL} onChange={(e) => setConfig({ baseURL: e.target.value })} />
      </label>

      <label className="settings-field">
        <span className="settings-label">API Key</span>
        <input className="settings-input" type="password" value={apiKey} onChange={(e) => setConfig({ apiKey: e.target.value })} />
      </label>

      <label className="settings-field">
        <span className="settings-label">型號 model</span>
        <input className="settings-input" value={model} onChange={(e) => setConfig({ model: e.target.value })} />
      </label>

      <div className="settings-actions">
        <button type="button" className="settings-test-button" onClick={testConnection}>測試連接</button>
        <button type="button" onClick={() => { clear(); setTest('idle'); }}>清除 key</button>
        <Link href="/">返去</Link>
      </div>

      <p className="settings-test-result" data-state={test}>
        {test === 'testing' && '測緊…'}
        {test === 'ok' && '通咗,可以用'}
        {test === 'fail' && '連唔到(可能 CORS 封咗、key 唔啱、或者網絡問題)'}
      </p>
    </main>
  );
}
```

- [ ] **Step 4: 测试全绿 + tsc + 提交**

Run: `npx vitest run app/settings/page.test.tsx`
Expected: PASS（5/5）。

```bash
npx tsc --noEmit
git add app/settings/page.tsx app/settings/page.test.tsx
git commit -m "feat: add /settings page with provider presets and connection test"
```

---

### Task 7: `SettingsLink` 入口 + 状态指示,接到 landing 与 /play

**Files:**
- Create: `components/SettingsLink.tsx` + `components/SettingsLink.test.tsx`
- Modify: `app/page.tsx`(landing 加 `<SettingsLink />`)
- Modify: `app/play/page.tsx`(游戏加 `<SettingsLink />`)
- Modify: `app/play/page.test.tsx`(加 `next/link` mock,因为现在渲染 `<Link>`)

**Interfaces:**
- Consumes: `useLlmConfigStore`(Task 1)、`hasLlmConfig`(Task 1)、`providerLabel`(Task 1)、`next/link`。
- Produces: `SettingsLink`(无 props)。class `.settings-link`,`data-configured`。

- [ ] **Step 1: 写失败测试**

`components/SettingsLink.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { SettingsLink } from '@/components/SettingsLink';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';

beforeEach(() => useLlmConfigStore.getState().clear());

describe('SettingsLink', () => {
  it('prompts to set a key when unconfigured', () => {
    render(<SettingsLink />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/settings');
    expect(link).toHaveAttribute('data-configured', 'false');
    expect(link).toHaveTextContent('設定你嘅 API key');
  });

  it('shows the active provider label when configured', () => {
    useLlmConfigStore.getState().setConfig({ provider: 'deepseek', baseURL: 'https://api.deepseek.com', apiKey: 'sk-user', model: 'deepseek-chat' });
    render(<SettingsLink />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-configured', 'true');
    expect(link).toHaveTextContent('用緊 你嘅 DeepSeek');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run components/SettingsLink.test.tsx`
Expected: FAIL — import 解析失败。

- [ ] **Step 3: 写 `SettingsLink`**

`components/SettingsLink.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useLlmConfigStore } from '@/lib/settings/llmConfigStore';
import { hasLlmConfig } from '@/lib/settings/llmConfig';
import { providerLabel } from '@/lib/settings/providers';

export function SettingsLink() {
  const provider = useLlmConfigStore((s) => s.provider);
  const baseURL = useLlmConfigStore((s) => s.baseURL);
  const apiKey = useLlmConfigStore((s) => s.apiKey);
  const model = useLlmConfigStore((s) => s.model);
  const configured = hasLlmConfig({ provider, baseURL, apiKey, model });
  return (
    <Link className="settings-link" href="/settings" data-configured={configured}>
      {configured ? `用緊 你嘅 ${providerLabel(provider)}` : '點心姨用緊基本回應 · 設定你嘅 API key'}
    </Link>
  );
}
```

- [ ] **Step 4: 测试通过**

Run: `npx vitest run components/SettingsLink.test.tsx`
Expected: PASS（2/2）。

- [ ] **Step 5: 接到 landing(`app/page.tsx`)**

在 `app/page.tsx` 加 import 与渲染（放在 `<main className="landing">` 内最前):

```tsx
import { SettingsLink } from '@/components/SettingsLink';
```

`<main className="landing">` 第一个子元素加:

```tsx
      <SettingsLink />
```

- [ ] **Step 6: 接到游戏(`app/play/page.tsx`)+ 给 play 冒烟加 next/link mock**

在 `app/play/page.tsx` 加 import 与渲染（放在 `<main className="teahouse">` 内最前):

```tsx
import { SettingsLink } from '@/components/SettingsLink';
```

`<main className="teahouse">` 第一个子元素加:

```tsx
      <SettingsLink />
```

把 `app/play/page.test.tsx` 整个替换为(顶部加 `next/link` mock,断言不变):

```tsx
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import { render, screen } from '@testing-library/react';
import PlayPage from '@/app/play/page';

describe('PlayPage (/play)', () => {
  it('renders the game surface (stamp book)', () => {
    render(<PlayPage />);
    expect(screen.getByLabelText('蝦餃 未蓋章')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: 全量回归 + tsc + 提交**

```bash
npx tsc --noEmit
npm test
git add components/SettingsLink.tsx components/SettingsLink.test.tsx app/page.tsx app/play/page.tsx app/play/page.test.tsx
git commit -m "feat: add SettingsLink entry/status and wire it into landing and play"
```

Expected: `npm test` 全绿（含 landing 冒烟 —— 它已 mock next/link,新增的 `.settings-link` 不影响其断言）。

---

### Task 8: 更新 `docs/INTEGRATION.md`(设置页契约)

**Files:**
- Modify: `docs/INTEGRATION.md`

**Interfaces:**
- Consumes: Task 6/7 落地的真实 class/data。
- Produces: 仅文档。

- [ ] **Step 1: 在 `docs/INTEGRATION.md` 末尾追加**

```markdown
## BYOK 设置页契约 —— 2026-06-29

路由:`/settings`(用户填自己的 OpenAI 兼容 API key)。入口/状态:`SettingsLink`(在 `/` 和 `/play` 顶部)。

### 安全
用户 key 只存浏览器 localStorage(persist key `tan-cha-llm`)、只发往用户选的 provider;**永不**经 `/api/chat`、永不 log、永不进响应体。视觉皮肤勿改这些数据流。

### 组件 class / data 契约
| 元素 | class | data |
|---|---|---|
| 入口/状态 | `.settings-link` | `[data-configured]`(true/false) |
| 设置页根 | `<main class="settings">` | — |
| 隐私说明 | `.settings-privacy` | — |
| 字段行 | `.settings-field` / `.settings-label` | — |
| 供应商下拉 | `.settings-provider-select` | — |
| 文本/密码框 | `.settings-input` | — |
| 操作区 | `.settings-actions` / `.settings-test-button` | — |
| 测试结果 | `.settings-test-result` | `[data-state="idle\|testing\|ok\|fail"]` |
```

- [ ] **Step 2: 提交**

```bash
git add docs/INTEGRATION.md
git commit -m "docs: add BYOK settings page contract for open-design"
```

---

## 实现后:收尾

全部任务完成后,用 `superpowers:finishing-a-development-branch` 收尾(`npm test` + `next build` 全绿 → 合并到 `master` / PR / 保留 / 丢弃)。手动 E2E(填 key → 測試連接 → 点单走真模型;清除 key → 兜底)是人工步骤。部署时**不配** `DEEPSEEK_API_KEY` 即可让无 config 用户走确定性兜底。
