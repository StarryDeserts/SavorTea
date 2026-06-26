# 叹茶 · 虚拟茶楼 v2 —「点单闯关」设计文档

> AI DimSum Monthly Hackathon 第五期参赛项目 · 核心玩法重设计
> 日期:2026-06-26 · 作者:solo
> 状态:已定稿(§11 三项决定已确认)

---

## 0. 本次变更摘要(取代了什么)

本文档**取代** `2026-06-25-tan-cha-teahouse-design.md` 的以下部分:

- **第 4 节 核心体验闭环** —— 由「文字对话主线 + 关键句跟读」改为「**语音自由点单闯关**」。
- **第 5.1 / 5.3 节 功能范围** —— 跟读从「核心受控亮点」降级为「提示/扶手」;新增「关卡 + 混合判分」。
- **第 8 节 对话引擎** —— DeepSeek 由「纯生成台词」扩展为「生成台词 + 地道点评 + 提示(结构化输出)」。

**保持不变(继续沿用旧 spec)**:第 6 节系统架构骨架、第 7 节 DimSum API 集成(corpus/jyutping/ASR/search 真实端点、免 key)、第 10 节错误兜底思路、第 12 节技术栈与部署、密钥安全(`DEEPSEEK_API_KEY` 仅 server 端)。

**变更动机**:旧设计里「被打分、给奖励」的核心动作是「照念固定 `orderPhrase` → 字符串相似度」,本质等于通用跟读;AI 对话是装饰(不影响进度)。把核心动作改成「自由说粤语完成点单任务、由 ASR 听懂、點心姨即场反应」,才让 DimSum 的 ASR 与 DeepSeek 真正成为玩法内核,和市面纯跟读 app 拉开差距。

---

## 1. 一句话定位

走进 AI 茶楼,**用嘴讲地道粤语**一关关把点心嗌到手:點心姨听懂你真讲的话、即场用粤语回应,讲成了就上菜、盖章、解锁文化卡,集齐一桌换「今日飲茶」分享卡。

## 2. 核心玩法:点单闯关

把现有的「点心纸」当关卡表,每道点心 = 一关,难度沿菜单递进、技能逐步叠加。

**单关循环:**

```
进入第 N 关
  → 點心姨给目标(粤文),例:「想試下你识唔识用粤语嗌蝦餃?记得有礼貌噉讲。」
  → 玩家【按麦自由讲】(打字为 fallback)
  → ASR 转写玩家真讲的话
  → 【混合判分】
       · 确定性 gate:转写是否满足本关 requires(过 / 不过)
       · DeepSeek:生成點心姨即场台词 + 地道星(1–3)+(不过关时)提示
  → 过关:上菜动画 + 盖章 + 解锁该点心文化卡 + 记地道星
     不过关:點心姨「吓?再讲多次?」+ 可展开提示(降级跟读:照念示范句)
  → 进入第 N+1 关
集齐 10 章 → 「今日飲茶」成绩单分享卡(关数 / 总星 / 最地道嗰句)
```

**设计原则:** 过关只由**确定性判定**决定(可靠、即时、零成本、断网可玩);DeepSeek 只做它擅长的(角色台词、用词地道度点评、提示),**不当裁判长**;模型异常时退回 fallback 台词 + 默认星,游戏不卡。

## 3. 关卡设计(逐点心递进)

### 3.1 技能阶梯(逐关叠加)

| 技能 | 含义 | 确定性 requires(标签) |
|---|---|---|
| `name` | 讲出点心名 | 转写含 `nameYue` 或 `namePutonghua` |
| `polite` | 礼貌讲法 | 含礼貌词:唔該 / 嚟 / 俾(我) |
| `quantity` | 数量 + 量词 | 含数字(一/两/兩/三…)+ 量词(個/籠/碟/碗/件/條/份/客) |
| `modifier` | 品类/做法限定 | 含限定词(豉汁 / 蝦 / 凍 / 熱 / 少甜 / 走青…,逐关指定) |
| `alias` | 识别简称/别名 | 含该点心的别名(如 蝦腸 ↔ 蝦腸粉) |
| `price` | 问价 | 含 幾錢 / 幾多錢 / 點賣 |
| `multi` | 一次点两样 | 转写命中 ≥ 2 个不同点心名 |
| `checkout` | 埋单收尾 | 含 埋單 / 結賬 / 睇數 |

一关的 `requires`(即 `DishTask.skills`,全文混用「requires / skills」指同一数组)是上述标签的组合(如 L3 = `name` + `quantity`)。判定全部命中才过关。

### 3.2 十关映射(按现有 `DISHES` 顺序,沿用各自 `orderPhrase` 减少返工)

| 关 | 点心 | 主技能(累加) | 目标示例(粤文,點心姨口吻) | requires |
|---|---|---|---|---|
| 1 | 蝦餃 | `name` + `polite` | 「用粤语唔該姨嚟一籠蝦餃。」 | name, polite |
| 2 | 燒賣 | + `quantity` | 「今次连埋数量,一籠燒賣噉嗌。」 | name, polite, quantity |
| 3 | 叉燒包 | `quantity` 巩固 | 「嗌兩個叉燒包,记得讲清楚几多个。」 | name, quantity |
| 4 | 鳳爪 | + `modifier`(豉汁) | 「试下要一碟豉汁鳳爪。」 | name, quantity, modifier |
| 5 | 腸粉 | + `alias`(蝦腸) | 「老广叫蝦腸,你噉嗌睇下姨听唔听得明。」 | name(alias), polite |
| 6 | 蛋撻 | `polite` 变体(后置唔該) | 「两个蛋撻唔該——礼貌放后面都得。」 | name, quantity, polite |
| 7 | 糯米雞 | + `price` | 「问下糯米雞几钱,再嗌一个。」 | name, price |
| 8 | 流沙包 | + `modifier`(趁热) | 「嗌流沙包,话俾姨知要热辣辣即蒸。」 | name, modifier(热) |
| 9 | 馬拉糕 | + `multi`(搭一样) | 「切件馬拉糕,顺便再搭多一样你钟意嘅。」 | name×2(multi) |
| 10 | 艇仔粥 | + `checkout` | 「最后一碗艇仔粥,食饱用粤语同姨埋单。」 | name, checkout |

> 关卡内容是**游戏设计**,可在实现/测试时微调;表中 requires 为判定骨架。表中括注(`name(alias)`、`modifier(热)`、`name×2(multi)`)**不是额外标签**,而是该技能的配置:`alias` 关用 `task.aliases` 命中、**且别名也算满足 `name`**;`modifier` 关用 `task.modifiers` 指定要命中的词;`multi` 关要求命中 ≥ 2 个不同点心名。每关附一句 `hint` 示范句(默认复用该点心 `orderPhrase`),供「提示/跟读」扶手使用。

### 3.3 地道星(1–3)

由 DeepSeek 看转写判**用词地道度**(非音准):3★ 全程地道粤文 + 礼貌到位;2★ 听得明但有书面腔/生硬;1★ 勉强达意。**过关与否不看星**(只看 requires);星只进成绩单。模型异常时:过关默认给 2★。

> **发音音准**不在闯关计分内,留在「提示/跟读」扶手里(想练再照念,沿用旧 `calculateTextSimilarity`)。

## 4. 混合判分机制(详)

```
玩家转写 transcript + 当前关点心 dish(含 task)
        │
        ├─ 确定性 checker(lib/game)──► pass: boolean   ← 决定过不过关(权威)
        │
        └─ POST /api/chat(server,注入 dish.task.goal + transcript + pass)
                 └─ DeepSeek JSON mode ──► { reply, stars, tip }
                          │
          模型失败 ─► { reply: fallback台词, stars: pass?2:0, tip: dish.task.hint }
```

- **确定性 checker**:纯前端/纯函数,输入 `(transcript, dish)`(dish 含 `task`),按 `task.skills` 标签逐项匹配(扩自现有 `detectOrderedDishes`)。可单测、断网可用、零成本。
- **DeepSeek 结构化输出**:复用 `/api/chat`(server 端代理,key 不出浏览器),改为请求 `response_format: json_object`,系统提示追加「当前关目标 + 玩家这句 + 是否已达成」,要求返回 `{ reply: string(粤文台词), stars: 1|2|3, tip: string }`。`reply` 仍是點心姨即场反应;`tip` 在不过关时给「可以噉讲」的纠正。
- **权威边界**:过关只认 checker 的 `pass`;模型给的 `stars`/`tip` 只是润色与点评。模型说什么都改变不了过关判定。

## 5. 输入方式

- **语音为主(计分路径)**:按麦录音 → `transcribeAudioBlob`(DimSum ASR)→ 转写既喂判分,也作为玩家这一回合显示在对话里(`.msg.msg-user`)。
- **打字 fallback**:保留 `OrderChat` 文字输入,走**同一条判分路径**(麦克风被拒/环境嘈/无麦也能玩,也方便无麦 demo)。这与旧 spec 第 10 节「麦克风被拒 → 切纯文字」一致。
- **提示/跟读扶手**:每关一个「唔識講?」按钮,展开示范句(`hint`),可点一下进入旧的「照念 → 音准打分」练习(纯练习,不影响过关)。

## 6. 容错与降级

| 失败点 | 兜底 |
|---|---|
| 麦克风被拒/不支持 | 自动切打字输入,提示「可以打字嗌,或者撳提示听下点讲」 |
| ASR 失败/超时/听唔清 | 點心姨 re-ask(fallback 台词),可重录或改打字;**不惩罚、不限重试次数** |
| 转写答非所问/未命中 requires | 判不过关(非报错)→ 點心姨追问 + 提示;玩家重试 |
| DeepSeek 异常 | `{ reply: fallback, stars: pass?2:0, tip: hint }`,过关判定不受影响 |
| iOS Safari 录音格式 | 统一 `convertBlobToWav` 转 WAV(沿用现成实现) |

## 7. 数据模型变更

### 7.1 关卡数据(待确认放置位置 —— 见 §11)

每关需要:`level`(序)、`dishId`、`skill`(展示用标签)、`goal`(粤文目标)、`requires`(标签数组)、`hint`(示范句)。

**倾向方案**:在 `Dish` 上加一个 `task` 字段(守住「加点心只改 `lib/dishes/data.ts`」),判定逻辑放独立 `lib/game/`:

```ts
// lib/dishes/types.ts 追加
export type OrderSkill =
  | 'name' | 'polite' | 'quantity' | 'modifier'
  | 'alias' | 'price' | 'multi' | 'checkout';

export interface DishTask {
  level: number;            // 1..10,关卡顺序
  skills: OrderSkill[];     // 本关考的技能(= requires 标签)
  goal: string;             // 點心姨给玩家的目标(粤文)
  hint: string;             // 示范句(默认 = orderPhrase)
  aliases?: string[];       // alias 技能用的别名,如 ['蝦腸','蝦腸粉']
  modifiers?: string[];     // modifier 技能要命中的词,如 ['熱','趁熱']
}

export interface Dish { /* …现有字段… */ task: DishTask; }
```

### 7.2 进度状态(Zustand,扩展 `teahouseStore`)

```ts
interface TeahouseState {
  messages: ChatMessage[];                 // 保留
  clearedDishIds: string[];                // 过关(= 盖章,取代旧 stampedDishIds 语义)
  stars: Record<string, number>;           // 每道点心地道星 0..3
  currentLevel: number;                    // 当前关:可由 clearedDishIds 推导(第一个未过关),clearLevel 推进它
  // actions: addMessage, clearLevel(id, stars)=记过关+星并推进 currentLevel, reset
}
```

> 迁移注:`stampedDishIds`→`clearedDishIds`、`bestScore`→`stars` 汇总。`StampBook`/`ShareCardButton` 改读新字段(class/props 名尽量不变,见 §9)。persist key `tan-cha-store` 沿用;旧 localStorage 结构不兼容,reset 即可(无账号、无云端,可接受)。

## 8. 架构与模块变更

| 模块 | 变更 |
|---|---|
| `lib/dishes/types.ts` `data.ts` | 加 `DishTask`;为 10 道点心补 `task`(goal/skills/hint/aliases/modifiers) |
| `lib/game/checker.ts`(新) | `checkOrder(transcript, dish): { pass, hit: Record<OrderSkill,boolean> }`,扩自 `detectOrderedDishes` |
| `lib/game/vocab.ts`(新) | 礼貌词/量词/数字/问价/埋单等匹配词表(可单测) |
| `lib/conversation/prompt.ts` | 追加「当前关目标 + 玩家这句 + pass」注入;系统提示要求 JSON 输出 |
| `app/api/chat/route.ts` `deepseek.ts` | 请求 `response_format: json_object`;解析 `{reply,stars,tip}`,失败兜底 |
| `lib/store/teahouseStore.ts` | 按 §7.2 改造 |
| `components/OrderChat.tsx` | 升级为闯关交互面:显示当前关目标、玩家(语音/打字)回合、點心姨台词、过关反馈 |
| `components/ShadowingButton.tsx` | 拆成两用:`VoiceOrderButton`(录音→转写→喂判分)+ 保留「提示/跟读」音准练习 |
| `app/page.tsx` | 由「10 个跟读行」改为「闯关流程 + StampBook + 分享卡」;过关阈值逻辑移入 store/checker |
| `components/StampBook.tsx` `ShareCardButton.tsx` | 读 `clearedDishIds`/`stars`;分享卡文案加「总星/最地道嗰句」 |

## 9. 前端整合契约新增(给 open-design 套样式)

沿用旧 `docs/INTEGRATION.md` 全部 class,新增以下**稳定 class / data-attr**(实现时同步写进 INTEGRATION.md):

| 区域 | class / data-attr |
|---|---|
| 关卡目标卡 | `.quest`, `.quest-level`, `.quest-skill`, `.quest-goal` |
| 语音点单按钮 | `.voice-order-button`, `[data-recording]`, `[data-busy]` |
| 提示/跟读扶手 | `.order-hint`, `.order-hint-button`, `.order-hint-phrase` |
| 地道星 | `.stars`, `.star`, `[data-filled]` |
| 过关反馈 | `.level-result`, `[data-pass]` |
| 對話气泡 | 沿用 `.msg`, `.msg-user`, `.msg-assistant` |
| 集章/分享卡 | 沿用 `.stamp-book`, `.stamp`, `[data-stamped]`, `.share-card-button` |

> 约束不变:組件只暴露语义 class,**不写最终视觉 CSS / 不改 props 名**(留给 open-design 套);DeepSeek key 仅 server 端。

## 10. 测试策略(增量)

- **单元**:`lib/game/checker`(每个 skill 标签的命中/不命中:含点心名、量词、礼貌词、问价、埋单、别名、多点心)、`vocab` 词表、prompt 构造器(注入了 goal/transcript/pass)、route 解析 `{reply,stars,tip}` + 模型失败兜底、store `clearLevel`/`reset`。
- **集成**:`/api/chat` JSON mode happy path(mock DeepSeek)、ASR transcribe happy path(固定 WAV)。
- **手动走查(demo 前必做)**:语音黄金路径(进店→第1关讲粤语→听懂→过关→盖章→…→埋单→分享卡);边界(拒麦走打字、答非所问、ASR 误识、断网仍可过关与回 fallback、刷新后进度在)。
- UI 正确性以浏览器实测为准,不以类型检查代替功能验证。

## 11. 关键决定(已定稿,2026-06-26 用户确认)

1. **关卡数据放哪**:**采用「`Dish.task` 字段 + 判定逻辑独立 `lib/game/`」**。守「加点心只改 `lib/dishes/data.ts`」单一来源;加点心一处搞定。(否决:独立 `levels.ts` 引用 dishId,会让加点心要动两处。)
2. **DeepSeek 结构化输出**:**采用单次 `response_format: json_object`**,模型直接回 `{reply, stars, tip}`;解析失败走 fallback 兜底,过关判定不依赖模型。(否决:台词/点评分两段调用,多一次往返与延迟。)
3. **输入方式**:**语音为主 + 打字 fallback(同一判分路径)**。非纯语音,保证拒麦/无麦/嘈杂环境与无麦 demo 都能玩。

## 12. 明确不做(YAGNI)

- 不做账号/云存档(localStorage 即可)。
- 不做实时流式语音对话(仍是「一句一录一判」回合制)。
- 不做关卡编辑器/多场景/多角色/排行榜(后续增强,不阻塞)。
- 不做 Web3/链上。

## 13. 与评分对齐(自检)

- **真用 DimSum 数据**:ASR 听懂自由粤语成为通关内核(不再只是字符串比对)+ 语料/粤拼/搜索沿用 ✔
- **玩法新**:情景化「点单闯关」,语音 + 角色即场反应,区别于纯跟读 ✔
- **demo 跑得通**:确定性判定保证可玩;断网/拒麦/模型异常全链路兜底 ✔
- **完成度与传播**:十关闭环 + 集章 + 今日饮茶分享卡 ✔
