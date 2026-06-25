# 叹茶 · 虚拟茶楼 — 设计文档

> AI DimSum Monthly Hackathon 第五期参赛项目设计
> 赛道:粤语饮食文化(以 DimSum 开放 API 为技术内核)
> 形态:Web App(响应式,移动优先) · 作者:solo · 周期:~1 个月
> 日期:2026-06-25

---

## 1. 一句话定位

把"识讲 + 识食 + 识文化"装进一场虚拟饮茶:用户走进 AI 茶楼,用地道粤语向"点心姨"点单,系统即时给发音评分,并讲解每道点心背后的粤语叫法与文化典故。

## 2. 为什么这个项目能赢

对齐黑客松两条核心评分线:

1. **真正用上 DimSum 独有数据**(而非通用大模型套壳):点心的粤文、粤拼、参考发音、文化标注全部来自 DimSum 语料 API;发音评分用 DimSum 的粤语 ASR;对话用语料检索增强(RAG-lite)约束 DeepSeek 讲地道粤文。
2. **文化点子新 + demo 跑得通**:茶楼/饮茶是粤语文化最有共鸣的场景;最难的"录音→转写→评分"链路在官方开源仓库 `dim-sum-shadowing-game` 已有可复用实现,demo 风险低。

与现有样板差异化:不同于「知识卡片」(静态展示)和「跟住读」(通用跟读),本项目是**情景化角色对话 + 饮食文化叙事 + 跟读评分**的组合,且垂直聚焦饮食。

## 3. 目标用户与场景

- **主要用户**:想学/想体验地道粤语的人(湾区与非粤语区年轻人、海外华人、对粤语饮食文化好奇的游客)。假设用户**能看中文,但不一定会讲粤语**。
- **典型场景**:碎片时间打开网页,花 3–5 分钟"饮一次茶",边玩边学会用粤语点几样点心,并记住它们的文化故事。

## 4. 核心体验闭环

```
入座茶楼
  → 点心姨用粤语招呼(固定语料音频开场)
  → 翻餐牌:每道点心卡 = 图 + 粤文名 + 粤拼 + 普通话释义 + 「听标准读音」+ 文化卡
  → 用地道粤语点单(文字输入,如「唔该,嚟笼虾饺」)
  → 关键点单句【语音跟读评分 0–100】(录音→转写→相似度,>70 触发庆祝)
  → 点心姨上菜 + 讲一段文化典故(DeepSeek + 语料注入)
  → 集齐一桌 / 解锁「老字号印章」
  → 生成「今日饮茶」分享卡(canvas 出图)
```

设计原则:对话主线走文字(稳),发音是"关键句跟读"这一受控亮点(不做全程语音识别,规避粤语 ASR 的不确定性)。

## 5. 功能范围

### 5.1 MVP(必做,1 个月内交付)

- 1 个茶楼场景 + 1 个角色(点心姨)
- **8–12 道点心**:虾饺、烧卖、叉烧包、凤爪、肠粉、蛋挞、糯米鸡、流沙包、马拉糕、艇仔粥(最终以能取到/补齐语料的为准)
- 餐牌与点心卡:粤文名、粤拼、普通话释义、标准读音播放、文化卡
- 文字点单对话(点心姨人设,RAG-lite 注入真实语料)
- 关键点单句跟读评分(复用 shadowing 链路)
- 印章册(集点心进度)+ 文化典故解锁
- 「今日饮茶」分享卡

### 5.2 后续(时间充裕才做,明确不阻塞 MVP)

- 粤语 TTS 让点心姨动态"开声"(Azure `yue-HK` 或 `dim-sum-idol` 粤语语音)
- 多角色 / 多场景(早茶 vs 夜茶、老字号 vs 街坊档)
- 排行榜与社交对战

### 5.3 明确不做(YAGNI)

- 不做全程语音对话与实时 ASR 对话
- 不做账号体系(进度存 localStorage 即可)
- 不做 Web3/链上(生态里有,但与本项目目标无关)

## 6. 系统架构

纯前端为主(Next.js),直连 DimSum 托管服务与 DeepSeek;无需自建后端(自建为降级备胎)。

```
┌──────────────────────────── 浏览器 (Next.js 16 / React 19) ────────────────────────────┐
│                                                                                          │
│  场景层(茶楼/餐牌/点心卡/点心姨/对话气泡, Tailwind)                                     │
│        │                         │                          │                            │
│  对话引擎                   跟读模块                    数据层                            │
│  - prompt 构造器(RAG-lite)  - WaveRecorder(wavesurfer)  - corpus 拉取/搜索             │
│  - DeepSeek 客户端           - transcribe 调用            - jyutping                      │
│        │                     - 相似度打分 + ScoreDisplay  - 音频 + 本地种子兜底           │
│        │                         │                          │                            │
│  进度状态 (Zustand: 印章册 / 已点点心 / 分数)   分享卡 (canvas → image)                  │
└──────────┬───────────────────────┬──────────────────────────┬────────────────────────────┘
           │                       │                          │
     DeepSeek API          api.shadowing.app.aidimsum.com   backend.aidimsum.com
   (对话缝合, 语料注入)    (/api/transcribe, /api/to_jyutping) (/v2/corpus_item, 搜索)
```

数据流(点一道点心的一次循环):
1. 进入餐牌时按点心的 `unique_id` 拉 `GET backend.aidimsum.com/v2/corpus_item`,得到粤文/粤拼/释义/音频/文化标注,渲染点心卡。
2. 用户文字点单 → prompt 构造器取该点心的真实语料片段注入系统提示 → 调 DeepSeek → 点心姨回话。
3. 点击跟读 → 录音 Blob 转 WAV → `POST /api/transcribe` 得转写文本 → `calculateTextSimilarity(转写, 目标粤文)` 得 0–100 分 → ScoreDisplay。
4. 完成 → Zustand 更新印章册;集齐触发分享卡。

## 7. DimSum API 集成细节(已核实真实端点)

| 能力 | 端点 / 实现 | 请求 / 返回要点 |
|---|---|---|
| 语料项 | `GET https://backend.aidimsum.com/v2/corpus_item?unique_id=<uuid>` | 返回含 `data`(粤文)、`note.meaning[]`(普通话释义)、`note.context.粤语文本/audio`、`structured_note.jyutping`(空格分隔,逐字对齐)、`structured_note.data[0].blocks[]`(含 `type:"audio"` 的音频块) |
| 粤拼转换 | `POST {SHADOW_API}/api/to_jyutping` body `{text}` → `{content}` | 给 MVP 自撰的点单话术补粤拼 |
| 粤语 ASR | `POST {SHADOW_API}/api/transcribe` multipart `file=<wav>, task=transcribe` → `{text}` | 底层 Qwen3-ASR(OpenRouter);CORS 全开,浏览器可直连 |
| 跟读打分 | 客户端 `calculateTextSimilarity`:转简体+去标点后归一化 Levenshtein → 0–100 | 复用 `textSimilarity.ts` 逻辑 |
| 语料搜索 | `https://search.aidimsum.com`(dim-sum-searcher) | RAG-lite 取候选地道表达/点心条目 |

其中 `SHADOW_API` 生产基址 `https://api.shadowing.app.aidimsum.com`,以环境变量 `NEXT_PUBLIC_API_URL` 配置。

> **鉴权状态(2026-06-25 实测)**:语料项、`/api/to_jyutping`、`/api/transcribe` 均**免 DimSum key 公开可用**(corpus → 200;to_jyutping → 200 并返回逐字粤拼;transcribe 空请求 → 500 校验错而非 401/403,即无鉴权门)。**本设计不需要 DimSum 语料库 API key。** 唯一需要的密钥是 `DEEPSEEK_API_KEY`(对话引擎)。DimSum key 申请到后,仅在需要更高频率/写入能力(如 `/api/libs` 自建语料、标注提交)时才用得上——属增强,不阻塞 MVP。

> 可直接参考/改写的开源实现(NonceGeek/dim-sum-shadowing-game):
> `utils/transcribeApi.ts`(录音转 WAV + 调 transcribe)、`utils/corpusItem.ts`(语料项→展示结构)、`utils/jyutpingApi.ts`、`utils/textSimilarity.ts`、`components/ScoreDisplay.tsx`、`components/WaveRecorder`。

## 8. 对话引擎(DeepSeek + RAG-lite)

- **人设**:点心姨——茶楼资深伙计,讲地道广府粤文,热情、爱讲古,会顺势纠正/教用户点单讲法。
- **系统提示要点**:① 只用地道粤文(俗字、句末助词:啦/㗎/喎/咩),拒绝书面普通话腔;② 紧扣当前点心;③ 文化典故必须基于注入的语料事实,不杜撰。
- **RAG-lite 注入**:每轮把"当前点心的语料项关键字段(粤文名、地道叫法、释义、文化标注)+ 经搜索取到的相关地道表达"拼进上下文,作为 DeepSeek 的事实约束。这是"真用上 DimSum 数据"的关键体现。
- **降级**:DeepSeek 异常时,点心姨回退到该点心的预设粤文话术(每道点心配 1–2 条 fallback 台词)。

## 9. 数据模型

### 9.1 点心种子数据(本地 `src/data/dishes.ts`,demo 不依赖实时 API)
每道点心:
```
{
  id, nameYue,            // 粤文名,如「虾饺」
  uniqueId?,              // DimSum 语料 unique_id(优先,用于实时拉取)
  jyutping,               // 粤拼(取自语料 / to_jyutping)
  meaningZh,              // 普通话释义
  audioUrl,               // 标准读音(语料音频)
  orderPhraseYue,         // 关键点单句目标,如「唔该,嚟笼虾饺」
  cultureNote,            // 文化卡文案(基于语料 + 可校对的史料)
  fallbackLines: []       // DeepSeek 降级台词
}
```
落地策略:先用 `search.aidimsum.com` 找到对应点心的真实 `unique_id` 并回填;取不到的字段用 `/api/to_jyutping` 补粤拼、自撰文化卡(标注待校对)。

### 9.2 进度状态(Zustand,持久化 localStorage)
```
{ orderedDishes: Set<id>, stamps: id[], scores: Record<id, number>, currentScene }
```

## 10. 错误处理与兜底

| 失败点 | 兜底 |
|---|---|
| 麦克风被拒 / 不支持 | 自动切纯文字模式,跟读项显示"标准读音可听,录音不可用" |
| ASR 请求失败/超时 | 可重录或跳过;连续失败提示改用文字继续 |
| corpus API 抖动 | 用本地种子数据渲染,demo 不中断 |
| DeepSeek 异常 | 回退到该点心 fallback 台词 |
| iOS Safari 录音格式 | 统一 `convertBlobToWav` 转 WAV 再上传(已在参考实现中处理) |

## 11. 测试策略

- **单元测试**:`calculateTextSimilarity`(含简繁/标点归一化)、prompt 构造器(给定点心→提示含语料字段)、语料项转换(API JSON → 展示结构)。
- **集成测试**:`fetchCorpusItem` happy path、`transcribe` happy path(用一段固定 WAV)。
- **手动走查(demo 前必做)**:黄金路径(入座→点单→跟读→上菜→集章→分享);边界(拒麦、答非所问、点错点心、网络抖动)。
- UI/前端正确性以浏览器实测为准,不以类型检查代替功能验证。

## 12. 技术栈与部署

- Next.js 16(App Router)、React 19、TypeScript、Tailwind CSS 4、Zustand、wavesurfer.js;UI 组件可选 Ant Design。
- 美术:AI 生成茶楼背景与点心姨立绘 + 点心图(统一暖色手绘风,具体风格在实现启动时定稿)。
- 部署:Vercel,一个链接即可 demo;环境变量 `NEXT_PUBLIC_API_URL`(指向公开的 shadowing 服务,无需 key)、`DEEPSEEK_API_KEY`(**唯一真正的密钥**,经 Next.js Route Handler 服务端代理,避免前端暴露)。

## 13. 风险与动作项

| 项 | 说明 | 行动 |
|---|---|---|
| 复用授权 | 语料/ASR/粤拼端点 2026-06-25 实测**免 key 公开可用**;但 license 未明示、限流与长期可用性未知 | 实现前联系 NonceGeek 确认代码复用与 API 调用授权(同属主办方,大概率鼓励);留自建 Deno 服务作降级 |
| 粤文地道度 | DeepSeek 粤文偶有书面腔 | RAG-lite + 系统提示约束 + 关键台词预设;小样本人工校对 |
| DeepSeek key 安全 | 不能暴露在前端 | 经 Next.js Route Handler 服务端代理 |
| 点心语料覆盖 | 个别点心可能无现成语料项 | 自撰字段并标"待校对",优先选有语料的点心进 MVP |

## 14. 里程碑(solo · ~4 周)

- **第 1 周**:脚手架 + 数据层(corpus 拉取/转换 + 8–12 道点心种子)+ 餐牌/点心卡 UI + 标准读音播放。
- **第 2 周**:跟读模块(录音/转写/打分/ScoreDisplay,改自开源)跑通 + 文字点单 UI。
- **第 3 周**:对话引擎(DeepSeek 代理 + RAG-lite 人设)+ 上菜/文化典故 + 印章册进度。
- **第 4 周**:分享卡 + 美术与音效打磨 + 兜底/错误处理 + demo 走查与录制。

## 15. 与评分对齐(自检)

- 用上 DimSum 独有数据:语料/粤拼/音频/ASR/搜索五处真实调用 ✔
- 文化叙事:每道点心文化卡 + 点心姨讲古 ✔
- demo 可跑通:最难链路有开源参考 + 全链路兜底 ✔
- 完成度与传播:闭环 + 印章册 + 分享卡 ✔
