# 前端整合契約 (for open-design re-skinning)

逻辑、数据、API 已完成。视觉设计用 open-design 产出后,按下表把样式套到对应组件 / class 上即可,**唔好改动 props 同 class 名**(否则会断开逻辑)。

## 组件清单与 props

| 组件 | Props | 作用 | 可套样式的 class |
|---|---|---|---|
| `OrderChat` | 无(自接 store) | 同點心姨对话、自动记录已点点心 | `.order-chat`, `.order-chat-messages`, `.msg`(每条消息都有), `.msg-user`, `.msg-assistant`, `.order-chat-form`, `.order-chat-input` |
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

## 手动验收清单 (manual E2E checklist)

- [ ] 输入「唔該嚟一籠蝦餃同一壺普洱」→ 點心姨回**粤文**(有 嘅/係/嚟 等粤语字),唔系普通话书面语。
- [ ] 蝦餃 喺集章册标记为「已点」(`detectOrderedDishes` 生效)。
- [ ] 撳 `ShadowingButton` 录「唔該嚟一籠蝦餃」→ 见到分数;讲得准 ≥70 → 该点心盖章。
- [ ] 断网或令 `/api/chat` 失败 → 對話仍回 fallback 粤语句,唔会卡死。
- [ ] 撳「生成今日飲茶分享卡」→ 下载到一张列出已点点心 + 最佳分数嘅 png。
- [ ] 刷新页面 → 已点 / 盖章 / 最佳分数 仍在(localStorage persist)。
- [ ] 浏览器 DevTools → Network 同 Sources 搜 `DEEPSEEK_API_KEY` 同 key 片段 → **搜唔到**(确认 key 无泄漏到前端)。
