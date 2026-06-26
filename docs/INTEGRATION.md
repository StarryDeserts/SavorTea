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
