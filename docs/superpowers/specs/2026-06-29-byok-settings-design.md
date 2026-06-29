# 叹茶 · 虛擬茶樓 —— BYOK 设置页设计(自带 API Key)

> **状态:** 设计已与产品负责人确认(2026-06-29)。下一步:`superpowers:writing-plans`。
>
> **目标:** 让体验者填自己的 OpenAI 兼容大模型 API Key,demo 不再烧 host 的额度。

## 1. 背景与动机

点单判定是**双层**的:`checkOrder`(确定性,离线决定过关/失败)+ DeepSeek 只供风味(點心姨台词 + 地道星 + 提示)。目前风味走 `/api/chat`(server 端读 env 的 `DEEPSEEK_API_KEY`)。问题:demo 人一多,host 的 key 不经用。

方案:加一个 `/settings` 页,让用户填**自己的** OpenAI 兼容 `{baseURL, apiKey, model}`,**浏览器直连**该 provider 取风味;key 永不经过本站服务器。没填 key 也能玩(确定性兜底台词)。

## 2. 三个已确认决策

1. **范围:** OpenAI 兼容 BYOK —— 用户填 `baseURL + apiKey + model`,一套代码路径覆盖 DeepSeek / OpenAI / Moonshot / 通义 / 本地等所有 OpenAI 兼容端点。**不**做原生 Anthropic/Gemini 适配。
2. **传输:** **客户端直连 provider** —— key 存浏览器,直接从浏览器调用户选的 provider;**绝不经过本站服务器**。
3. **host key:** 部署的 demo **不配** env key;无 config 的用户走确定性兜底(游戏照玩,點心姨用 `buildJudgeFallback` 的台词)。本地开发仍可用 env key。

## 3. 全局约束 (Global Constraints)

- 新依赖:**无**(复用现有 fetch / zustand / opencc 等)。
- `checkOrder` 与游戏 store(`tan-cha-store` v1)**一律不改**;BYOK 只改"取风味"这一步。
- 设置 store 与游戏 store **分开**:新 persist key `tan-cha-llm`(v1)。
- **安全红线**:用户 key 只存浏览器 localStorage,只发往**用户选的 provider**;**永不**发往本站 `/api/chat`、**永不** log、**永不**进任何响应体。
- 产品/界面文案用地道粤文(係/唔/嘅/咗/喺/嚟/俾);技术术语(baseURL、model、API Key)保留原词。
- 设置页**视觉皮肤 = open-design**;本工作流交结构 + 语义 class + 逻辑,纯语义 class(无 Tailwind 工具类),与 `StampBook`/landing 既有模式一致。
- `/api/chat` + server-only `deepseek.ts` 保留;`DEEPSEEK_API_KEY` 仍只在 server 端,其安全断言不变。

## 4. 架构:判定分叉

```
OrderChat.attempt(text)
  ├─ checkOrder(text, dish) → pass        ← 确定性,不变,决定过关
  ├─ llmConfig = useLlmConfigStore.getState()   ← 取用时读,避免订阅重渲染
  ├─ try: judge = await judgeOrder({dishId,transcript,pass}, llmConfig)
  │     ├─ 有 config(hasLlmConfig):浏览器 buildJudgePrompt → postChatCompletions
  │     │     直连 config.baseURL/chat/completions(Bearer config.apiKey, config.model, json)
  │     │     → parseJudgeContent;解析失败则 throw
  │     └─ 无 config:fetch('/api/chat', {dishId,transcript,pass})(现有 host 路径)
  │           部署无 env key → 服务器自身 catch 返回 buildJudgeFallback
  └─ catch: judge = buildJudgeFallback(dish, pass)   ← OrderChat 既有兜底层,唯一兜底点
```

**关键不变量:** 有 config 时,`judgeOrder` 调用 `postChatCompletions`(URL = 用户 baseURL),**绝不** `fetch('/api/chat')` —— key 不经本站服务器。任何失败(CORS / 网络 / key 错 / 解析)都冒泡到 `OrderChat` 的 catch → `buildJudgeFallback`,游戏不断。

## 5. 新增 / 改动文件与接口

### 新增
- **`lib/settings/llmConfigStore.ts`** —— Zustand + persist(key `tan-cha-llm`,v1)。
  - `interface LlmConfig { provider: string; baseURL: string; apiKey: string; model: string }`
  - state = `LlmConfig` + `setConfig(p: Partial<LlmConfig>): void` + `clear(): void`。
  - 初始值 = DeepSeek 预设(`provider:'deepseek'`, `baseURL:'https://api.deepseek.com'`, `model:'deepseek-chat'`, `apiKey:''`)。
  - 导出纯函数 `hasLlmConfig(c: LlmConfig): boolean = !!(c.baseURL && c.apiKey && c.model)`。
- **`lib/settings/providers.ts`** —— `interface ProviderPreset { id: string; label: string; baseURL: string; defaultModel: string }`;导出 `PROVIDER_PRESETS: ProviderPreset[]`(见 §7)。
- **`lib/conversation/openaiCompatible.ts`** —— **非 server-only** 纯函数:
  ```ts
  export async function postChatCompletions(opts: {
    baseURL: string; apiKey: string; model: string;
    messages: ChatMessage[]; jsonMode?: boolean;
  }): Promise<string>
  ```
  POST `${baseURL}/chat/completions`,`Authorization: Bearer ${apiKey}`,body `{model, messages, temperature:0.8, max_tokens:400, response_format?}`;`!res.ok` 抛错;返回 `choices[0].message.content ?? ''`。
- **`app/settings/page.tsx`** —— 设置页(见 §6)。
- **`components/SettingsLink.tsx`** —— 入口 + 状态指示(见 §6)。

### 改动
- **`lib/conversation/deepseek.ts`**(server-only)—— `callDeepSeek` 读 env 后委托 `postChatCompletions({ baseURL: env, apiKey: env, model:'deepseek-chat', messages, jsonMode })`。**行为不变**,DRY。`import 'server-only'` 保留。
- **`lib/conversation/engine.ts`** —— `judgeOrder(input, llmConfig?: LlmConfig)` 加 §4 分叉;**自身不调 `buildJudgeFallback`**,失败一律抛错由 `OrderChat` 兜底(保持单一兜底层)。
- **`components/OrderChat.tsx`** —— `attempt()` 内 `const llmConfig = useLlmConfigStore.getState()`,传入 `judgeOrder(..., llmConfig)`。既有 try/catch + `buildJudgeFallback` 不动。
- **`docs/INTEGRATION.md`** —— 追加设置页/状态指示的 class 契约。
- **(部署)** 不配 `DEEPSEEK_API_KEY`(代码无需改;route 已会在无 env 时 catch 返回兜底)。

## 6. 设置页 `/settings`(独立路由)

入口:landing/游戏放一个齿轮 `<Link href="/settings">`,由 `SettingsLink` 渲染并显示状态:
- 无 config → 「點心姨用緊基本回應 · 設定你嘅 API key」
- 有 config → 「用緊 你嘅 {provider label}」(`provider` 是 preset **id**,经 `PROVIDER_PRESETS` 解析成 label 显示,如 `deepseek`→`DeepSeek`)

表单(`app/settings/page.tsx`,`'use client'`):
1. **供應商** 下拉(`PROVIDER_PRESETS`)—— 选中→`setConfig` 填 baseURL+defaultModel(选「自定义」则清空让用户填)。
2. **接口地址** baseURL 文本框。
3. **API Key** —— `type="password"` 输入。
4. **型號** model 文本框。
5. **「測試連接」按钮** —— 调 `postChatCompletions` 做一次极小请求(一条 `{role:'user',content:'ping'}`,`max_tokens` 小),三态:
   - `測緊…` / `通咗,可以用` / `連唔到(可能 CORS 封咗、key 唔啱、或者網絡問題)`
   - 浏览器拿不到 CORS 细节,失败信息如实并列几种可能。
6. **儲存**(`setConfig`)/ **清除 key**(`clear`)/ **返去**(`<Link href="/">`)。
7. **隐私说明**(显眼):「你嘅 API key 只存喺你部機,直連你揀嘅 provider,唔會經過我哋嘅伺服器、唔會上傳、唔會 log。」

**class 契约**(给 open-design):`.settings` / `.settings-field` / `.settings-label` / `.settings-input` / `.settings-provider-select` / `.settings-test-button` / `.settings-test-result`(`data-state="idle|testing|ok|fail"`)/ `.settings-actions` / `.settings-privacy` / `.settings-link`(状态指示带 `data-configured`)。

localStorage 持久化(刷新还在)+ 「清除 key」按钮。**不**做 session-only 开关(YAGNI)。

## 7. provider 预设(`PROVIDER_PRESETS`)

| id | label | baseURL | defaultModel |
|---|---|---|---|
| `deepseek` | DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| `openai` | OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `moonshot` | Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| `qwen` | 通义(DashScope) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| `custom` | 自定义 | `` | `` |

> 型号是"选了就能用"的合理默认,用户随时可改。实现时可微调 model id。

## 8. 安全与隐私

- **key 只**存浏览器 localStorage,**只**发往用户选的 provider;BYOK 路径里本站服务器零参与 → **无 SSRF、无 host 转发**。
- **永不** log key、**永不**放进响应体。
- localStorage 持久化在公用电脑会残留 → 「清除 key」按钮显眼。
- **CORS 风险**:直连成不成取决于各 provider 是否放行浏览器。靠「測試連接」在配置时暴露 + 全程 `buildJudgeFallback` 兜底。实现时实测 DeepSeek/OpenAI 浏览器直连,结果写进设置页提示文案。
- 现有 `/api/chat` host-key 不泄漏的断言**保持**。

## 9. 测试(只测逻辑)

- `llmConfigStore`:`setConfig` 合并、`clear` 复位、persist key=`tan-cha-llm`;`hasLlmConfig` 三种缺字段为 false、齐全为 true。
- `providers`:选 preset 得到对应 baseURL+defaultModel;`custom` 为空。
- `postChatCompletions`:mock `fetch`,断言 URL=`${baseURL}/chat/completions`、`Authorization: Bearer ${apiKey}`、body 含 `model`/`messages`/(jsonMode 时)`response_format`;`!ok` 抛错;解析 `choices[0].message.content`。
- **`judgeOrder` 分叉(关键安全测试)**:
  - 有 config → `fetch` 被调用的 URL 含 `baseURL`、带 `Bearer apiKey`,且**从未**用 `'/api/chat'` 调用(证明 key 不经本站)。
  - 无 config → 用 `'/api/chat'` 调用。
  - provider 返回坏 JSON → 抛错(由 OrderChat 兜底)。
- 设置页:渲染;选 preset 填充 baseURL+model;儲存后 store 持久化;測試連接三态(mock fetch 成功/失败);清除后 `hasLlmConfig` 为 false。
- `OrderChat`:有 config 时把 config 传入 `judgeOrder`;`judgeOrder` 抛错时仍 `buildJudgeFallback`(既有行为)。
- 现有 `/api/chat` 与 `callDeepSeek` 测试(委托 `postChatCompletions` 后)保持绿。

## 10. 范围边界(本设计不含)

- 不做原生 Anthropic/Gemini 适配(只 OpenAI 兼容)。
- 不做用量计费/限流/配额。
- 不做游戏中途逐条切换 provider(改设置即下次生效)。
- 不删 `/api/chat`(留作无 config 的 host 路径)。
- 设置页**视觉皮肤 = open-design**(本设计只交结构 + class + 逻辑)。
- 不做 session-only key 开关。
