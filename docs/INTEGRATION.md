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

## Landing 门面(`/`)契约 —— 2026-06-29

路由:`/` = landing(长滚动 onboarding);`/play` = 游戏(组件未变,仅换路由)。

### 分工与 motion ↔ CSS 边界
- 本工作流(motion)拥有:会动的包裹元素的 `transform`(平移/缩放)、`opacity`、入场/滚动(`whileInView`)/交错/呼吸编排、hover/tap。
- open-design(CSS)拥有:全部静态视觉(颜色/背景/字体/间距/边框/阴影)+ **响应式**(媒体查询、菜单墙网格列数、容器最大宽度与留白)+ 装饰性循环动画(热气、微光等),装饰动画放在**子元素或 `::before/::after`**,**不要**对 motion 包裹元素再写 `transform`/`transition: transform`(会与 motion 内联样式冲突)。
- 本工作流只交付**语义化结构骨架**(`.landing` / `.menu-wall`(`<ul>`,天然网格容器)/ 各 `section`),不写 Tailwind 断点工具类,响应式由 open-design 在上述 class 上用 CSS 实现 —— 与现有 `StampBook` 等组件"纯语义 class、视觉全在 globals.css"的既有模式一致。

### 组件 class / prop / data 契约
| 组件 | Props | 关键 class | data 属性 |
|---|---|---|---|
| `DishIcon` | `{ dish: Dish; className? }` | `.dish-icon` / `.dish-emoji` | `[data-dish-id]` |
| `LandingHero` | `{ clearedCount; total }` | `.landing-hero` / `.landing-hero-title` / `.landing-hero-slogan` | — |
| `HowToPlay` | 无 | `.how-to-play` / `.how-step` / `.how-step-icon` / `.how-step-title` / `.how-step-desc` | `.how-step[data-step="1\|2\|3"]` |
| `MenuWall` | `{ dishes; clearedDishIds; stars }` | `.menu-wall` / `.menu-dish` / `.menu-dish-icon` / `.menu-dish-name` / `.menu-dish-status` / `.menu-dish-todo` / `.stars` / `.star` | `.menu-dish[data-cleared]`、`.star[data-filled]` |
| `CulturalIntro` | 无 | `.cultural-intro` / `.cultural-intro-body` | — |
| `EnterCta` | `{ clearedCount; total }` | `.enter-cta`(内含 `<a href="/play">`) | `.enter-cta[data-returning]` |
| landing 容器 | — | `<main class="landing">` | — |

### SVG 交付(phase 2,填进 `components/DishIcon.tsx` 的 `DISH_SVGS`)
- 扁平 2–3 色图标风;统一 `viewBox="0 0 64 64"`;**不写死** `width/height`(由 CSS 控制尺寸);尽量用 `currentColor`;以可直接放进映射的 `<svg>` 片段交付,键为 `dish.id`(见 `lib/dishes/data.ts`)。
- 缺图时 `DishIcon` 自动回退该 dish 的 `emoji`,所以可逐道增量交付。

### 字体
`app/layout.tsx` 暴露 `--font-noto-hk`(Noto Sans HK)与现有 `--font-geist-sans`/`--font-geist-mono`;用哪族、如何配色由 open-design 在 CSS 决定。
