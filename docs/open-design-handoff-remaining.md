# 交接给 open-design:剩余页面设计(按优先级)

> 日期:2026-06-29 · 来自:逻辑/结构侧 · 给:open-design(视觉侧)
> 已完成:`/` landing(见 `uiux-design/landing.html`)+ 10 个茶点 SVG(`uiux-design/dish-svgs.html`)。
> 本文 = 还没设计的三块,各自一份可直接开跑的 prompt,**按 P1 → P2 → P3 优先级**做。

---

## 通用规则(三份都适用,先读)

**设计语言**:延续 landing 的「红绒 × 竹白 × 茶汤金」。**复用 landing 已定义的 `:root` 令牌,不要另起色板**:
`--tea-ink` / `--tea-ink-soft` / `--tea-paper` / `--tea-paper-2` / `--tea-rouge` / `--tea-rouge-deep` / `--tea-jade` / `--tea-gold` / `--tea-gold-bright` / `--tea-stamp` / `--tea-border` / `--tea-todo` / `--r-card` / `--shadow-card` / `--font-hk` / `--font-mono`(定义在 `landing.html` 的 `:root`,会进 `globals.css`)。母题词汇:牌匾、票券齿孔、红印章、蒸笼热气、流光。

**交付格式**(和 landing.html 一模一样):每块产出**一个自包含 `<page>.html` 预览** + 一段明确标注 **「貼回 globals.css 從這裡開始 … 到這裡結束」** 的 CSS 块;预览专用骨架(`*{}`/`body{}`/字体 mock)单独标注、贴回时删。

**铁律**:
1. 只产出 CSS(分享卡那份产出视觉稿)。**不碰 `.tsx` / 逻辑 / 路由**。
2. **不改任何 class / `data-*` / prop 名** —— 逻辑和测试都钉在这些字符串上。要新 hook 找逻辑侧加。
3. **motion ↔ CSS 边界**:不对带 motion 的包裹元素写 `transform` / `transition: transform`(会和 motion 内联样式打架);装饰循环动画挂**子元素 / `::before` / `::after`**。
4. 品牌字保持**简体「叹」**;其余粤文是繁体(既定风格)。
5. 文案在 `.tsx` 里;预览可用下面给的示例文案,**最终文案以 `.tsx` 为准**,要改提出来由逻辑侧改。
6. **星星统一**:`.star` 沿用 landing 的 clip-path 画法,并记得给 `.star` 加 `font-size:0`(组件里 `.star` 内有个 `★` 字符,要盖掉)。

**权威 class/data 契约**:`docs/INTEGRATION.md`(landing 段 + BYOK 段)。

---

## P1 — `/play` 游戏页(最优先,demo 主战场)

现状:`globals.css` 里游戏页**半旧皮肤 + 一堆全裸** —— v2 闯关的新类(`.quest*` / `.level-result` / `.voice-order-button`)完全没样式,旧 `.order-chat` / `.stamp` / `.teahouse` 是旧色板。请**按新色板整套重做**。

**DOM 骨架**(`<main class="teahouse">` 内,从上到下):

```html
<main class="teahouse">
  <a class="settings-link" data-configured="false">…</a>   <!-- 入口/状态;样式见 P2,全局一处 -->
  <h1>叹茶 · 虛擬茶樓</h1>

  <section class="order-chat">          <!-- 全部叹晒时:.order-chat[data-all-cleared] -->
    <div class="quest">
      <span class="quest-level">第 1 關 / 10</span>
      <ul class="quest-skill-list">
        <li class="quest-skill">講出點心名</li>
        <li class="quest-skill">禮貌講法</li>
      </ul>
      <p class="quest-goal">用粵語唔該姨嚟一籠蝦餃。</p>
    </div>

    <ul class="order-chat-messages">
      <li class="msg msg-assistant">好嘞,歡迎嚟到虛擬茶樓!跟住下面嘅目標,用粵語同姨嗌嘢飲茶啦。</li>
      <li class="msg msg-user">唔該嚟一籠蝦餃</li>
      <li class="msg msg-assistant">好叻!蝦餃一籠,即刻嚟。</li>
    </ul>

    <div class="level-result" data-pass="true">   <!-- 判分结果卡;失败时 data-pass="false" 且显示 tip -->
      <span class="stars" aria-label="3 粒星">
        <span class="star" data-filled="true"></span>
        <span class="star" data-filled="true"></span>
        <span class="star" data-filled="true"></span>
      </span>
      <p class="level-result-tip">提示:唔該嚟一籠蝦餃</p>   <!-- 仅 data-pass="false" 时出现 -->
    </div>

    <div class="order-hint">
      <button type="button" class="order-hint-button">唔識講?</button>
      <div class="order-hint-body">                <!-- 展开态 -->
        <p class="order-hint-phrase">唔該嚟一籠蝦餃</p>
        <button class="shadowing-button" data-recording="false">跟讀</button>
      </div>
    </div>

    <form class="order-chat-form">
      <button class="voice-order-button" data-recording="false" data-busy="false">㩒住講</button>
      <input class="order-chat-input" placeholder="同點心姨講…(例如:唔該嚟一籠蝦餃)">
      <button type="submit">嗌</button>            <!-- 无 class,用 .order-chat-form button[type=submit] -->
    </form>
  </section>

  <ul class="stamp-book">                <!-- 印仔簿 10 格 -->
    <li class="stamp" data-stamped="true">
      <span class="stamp-emoji">🦐</span><span class="stamp-name">蝦餃</span>
    </li>
    <li class="stamp" data-stamped="false">
      <span class="stamp-emoji">⚪</span><span class="stamp-name">燒賣</span>
    </li>
    <!-- …共 10 道,未盖印的 stamp-emoji 是 ⚪ -->
  </ul>

  <button type="button" class="share-card-button">睇我嘅「今日飲茶」</button>   <!-- 仅全部叹晒后出现 -->
</main>
```

**必须做好看的状态**(别只做一态):
- `.order-chat` 进行中 vs `.order-chat[data-all-cleared]`(后者只剩一句「十關全部叹晒!…」完成语,无表单)。
- `.voice-order-button`:闲置 / `data-recording="true"`(录音中,要有明显「正在听」反馈)/ `data-busy="true"`(转写+判分中)。
- `.level-result[data-pass="true"]`(过关,亮金星)vs `[data-pass="false"]`(失败,显示 `.level-result-tip`)。
- `.star[data-filled]` 亮/暗;`.stamp[data-stamped]` 已盖(emoji)/ 未盖(⚪,压灰)。
- `.shadowing-button[data-recording]` 两态;`.order-hint-body` 折叠/展开(展开由 `.tsx` 控制,你只给展开态样式)。
- `.msg-user` vs `.msg-assistant` 气泡区分(点心姨 vs 玩家)。

**建议**:`.quest` 像一张「點心紙/任务牌」;`.order-chat-messages` 像茶客对话;桌面端可双栏(左对话/右印仔簿),手机单列 —— 但**结构是单列 DOM**,双栏由你的 CSS grid 实现。

---

## P2 — `/settings` 设置页 + `.settings-link` 入口

现状:`globals.css` 里 `.settings*` 全裸。这页是 BYOK(用户填自己 API key)的门面。

**DOM 骨架**:

```html
<main class="settings">
  <h1>設定 · API Key</h1>
  <p class="settings-privacy">你嘅 API key 只存喺你部機,直連你揀嘅 provider,唔會經過我哋嘅伺服器、唔會上傳、唔會 log。</p>

  <label class="settings-field">
    <span class="settings-label">供應商</span>
    <select class="settings-provider-select"><option>DeepSeek</option>…</select>
  </label>
  <label class="settings-field">
    <span class="settings-label">接口地址 baseURL</span>
    <input class="settings-input" value="https://api.deepseek.com">
  </label>
  <label class="settings-field">
    <span class="settings-label">API Key</span>
    <input class="settings-input" type="password">
  </label>
  <label class="settings-field">
    <span class="settings-label">型號 model</span>
    <input class="settings-input" value="deepseek-chat">
  </label>

  <div class="settings-actions">
    <button type="button" class="settings-test-button">測試連接</button>   <!-- 没填 key 时 disabled -->
    <button type="button">清除 key</button>      <!-- 无 class,用 .settings-actions button -->
    <a href="/">返去</a>                          <!-- 无 class,用 .settings-actions a -->
  </div>

  <p class="settings-test-result" data-state="idle">…</p>
</main>
```

`.settings-test-result` 四态文案(`data-state`):`idle`(空)/ `testing`「測緊…」/ `ok`「通咗,可以用」/ `fail`「連唔到(可能 CORS 封咗、key 唔啱、或者網絡問題)」。

**还有一处全局入口**(出现在 `/` 和 `/play` 顶部,样式写一份):

```html
<a class="settings-link" data-configured="false">點心姨用緊基本回應 · 設定你嘅 API key</a>
<a class="settings-link" data-configured="true">用緊 你嘅 DeepSeek</a>
```

**状态**:`.settings-test-button[disabled]` 态;`.settings-test-result` 四态(`ok` 绿、`fail` 红);密码框遮挡感;`.settings-link[data-configured]` 两态(未配置=提示色,已配置=低调确认色)。整体像「茶楼后厨配置牌」,克制、清晰、可读。

---

## P3 — 分享卡「今日飲茶」(不同工作流:给视觉稿,不是 CSS)

分享卡是 **canvas 画出来的 600×800 PNG**(`lib/share/shareCard.ts`),**不是 HTML/CSS**,所以这块**不要给 CSS**,而是给我**一张 600×800 的视觉稿**(HTML/SVG/PNG 皆可)+ 一份「元素位置 + 颜色(hex)」清单,我来翻成 canvas 绘制代码。

**卡上要有的内容**(数据来自游戏):
- 標題「今日飲茶」
- 日期(例:`2026-06-29`)
- 已叹点心列表:`emoji + 粵文名`(最多 10 行,例:🦐 蝦餃 / 🥟 燒賣 …)
- 底部成績:「叹咗 N 道 · M 粒星」(例:叹咗 10 道 · 26 粒星)

**约束**:
- 画布 **600 × 800**。
- 颜色给 **hex/rgb**(canvas 不能用 oklch 变量);可参考旧版 `#f7f1e3`(纸)/`#7a4a2b`(茶啡),但请升级到新「红绒×竹白×茶汤金」色板并给出对应 hex。
- 字体:canvas 默认 `sans-serif`;若要用 Noto Sans HK / 牌匾字,告诉我,我在生成前预加载 web font。
- 风格呼应茶楼:牌匾標題、红印章、亮金星、票券质感都好;但记住这是**静态成績單**,要适合截图分享。
- 交付:`share-card.html`(或 .svg/.png 视觉稿)+ 一句话色板/排版说明。我据此重写 `drawShareCard`。

---

## 优先级与收尾

P1 `/play` → P2 `/settings` → P3 分享卡。每块完成后,把 `<page>.html`(P1/P2)或视觉稿(P3)放进 `uiux-design/`,告诉逻辑侧,我负责贴进 `globals.css` / 翻成 canvas、跑测试、真机核对。class/data 有疑问查 `docs/INTEGRATION.md` 或问逻辑侧,别自己猜着改逻辑。
