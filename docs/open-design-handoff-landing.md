# 交接给 open-design:Landing 门面视觉皮肤

> 日期:2026-06-29 · 来自:逻辑/结构侧 · 给:open-design(视觉侧)
> 权威契约见 [`docs/INTEGRATION.md`](./INTEGRATION.md) 末尾的「Landing 门面契约」小节 —— 本文是任务简报,契约以那份为准。

## 一句话

Landing 门面的**结构、逻辑、动画编排(motion)已经做好并合并到 master**,游戏已搬到 `/play`。现在请你做**视觉皮肤**:把一堆语义化 class 在 `app/globals.css` 里上妆(配色、排版、布局、响应式、装饰动效),再画 **10 个茶点 SVG**。

## 背景:这次改了什么

- 路由拆开了:`/` = 新 landing(长滚动 onboarding),`/play` = 原来的游戏(组件零改动,只是换了路由)。
- 新增了 5 个 landing 组件 + 1 个共享图标组件,全部只带**语义 class + `data-*`**,没有任何视觉样式 —— 跟当初游戏页交给你上皮肤前是同一个状态。
- 动画用了 `motion`(Framer Motion),**入场/滚动浮现/hover/tap 这类"位移类"动画已经由组件用 motion 做了**;你负责静态视觉 + 装饰性动画(见下方红线)。

## 你的交付物(按优先级)

**P0 — Landing 视觉皮肤(`app/globals.css`)**
给下面每个区块写 CSS,做出"港式茶楼门面"的卖相。区块从上到下:
1. `main.landing` —— 整页容器(最大宽度、居中、留白、背景/底纹)
2. `.landing-hero` —— 招牌 hero,第一印象要抓人(`.landing-hero-title` 招牌字、`.landing-hero-slogan` 标语)
3. `.how-to-play` —— 玩法三步图解(三个 `.how-step`,各有 `.how-step-icon`/`.how-step-title`/`.how-step-desc`)
4. `.menu-wall` —— 10 道點心菜单墙(网格)
5. `.cultural-intro` —— 文化引子短文
6. `.enter-cta` —— 進入按钮(注意它在页面里**出现两次**:hero 里一个、页尾一个,所以 `.enter-cta` 的样式会同时命中两处)

**P0 — 响应式**
这块完全归你(组件只给了语义结构,没写任何断点类)。重点:
- `.menu-wall` 是 `<ul>`,网格列数随宽度变(手机 2 列、桌面 4–5 列之类,你定)
- 桌面端内容居中 + 大留白;移动端收成单列
- hero 在宽屏怎么铺、字阶怎么变

**P1 — 装饰性动画(CSS,在边界内)**
蒸笼热气、招牌微光、底纹流动这类**装饰循环**。⚠️ 必须放在**子元素或 `::before/::after`** 上,不要碰 motion 控制的包裹元素的 `transform`(见红线)。

**P2 — 10 个茶点 SVG(增量,可逐个交)**
填进 `components/DishIcon.tsx` 顶部的 `DISH_SVGS` 映射(键 = `dish.id`)。没填的会自动回退 emoji,所以可以一个一个交、不阻塞。要画的 10 道:

| dish.id | 粤文名 | 现回退 emoji |
|---|---|---|
| `har-gow` | 蝦餃 | 🦐 |
| `siu-mai` | 燒賣 | 🥟 |
| `char-siu-bao` | 叉燒包 | 🍖 |
| `fung-zaau` | 鳳爪 | 🐔 |
| `cheung-fan` | 腸粉 | 🍥 |
| `daan-taat` | 蛋撻 | 🥧 |
| `no-mai-gai` | 糯米雞 | 🍚 |
| `lau-sa-bao` | 流沙包 | 🌟 |
| `maa-laai-gou` | 馬拉糕 | 🍞 |
| `teng-zai-zuk` | 艇仔粥 | 🥣 |

SVG 规格:扁平 2–3 色图标风;统一 `viewBox="0 0 64 64"`;**不写死** `width/height`(尺寸由 CSS 控制);尽量用 `currentColor` 便于主题着色。这套 SVG 之后游戏页的印仔簿、分享卡也会复用。

> 范围说明:游戏页 `/play` 的视觉重做是**之后单独一轮**,不在这次交接里。这次只做 landing + SVG。

## 红线(必须遵守,否则会打架 / 弄坏逻辑)

1. **只改 `app/globals.css` 和加 SVG 资源。** 不要动任何 `.tsx`、路由、store、逻辑文件。
2. **不要改 class 名、`data-*` 名、prop 名** —— 逻辑和测试都钉在这些字符串上。要新 hook 找我加。
3. **motion ↔ CSS 边界**(关键):
   - motion 拥有"会动的包裹元素"的 `transform`(位移/缩放)、`opacity`、入场/滚动/hover/tap。
   - 你**不要**对这些包裹元素再写 `transform` 或 `transition: transform`(会和 motion 的内联样式冲突、抖动)。
   - 你给盒子上色/排版,装饰动画挂到**子元素或伪元素**。
4. **品牌字保持简体「叹」**:`叹茶`/`叹咗`/`未叹` 全站统一用简体 叹(其余粤文用字是繁体,这是既定风格,别去"统一"成繁体 嘆)。
5. **文案在 `.tsx` 里**(hero 标语、玩法三步、文化引子都是粤文)。要改文案跟我讲,别直接改逻辑文件。

## 需要你照顾的"状态",别只做一个样子

这些是动态的,两种状态都要好看:
- `.menu-dish[data-cleared="true"]` vs `[data-cleared="false"]` —— 已叹(显示 `.stars`,其中 `.star[data-filled="true"]` 是亮星)vs 未叹(显示 `.menu-dish-todo`「未叹」)。
- `.enter-cta[data-returning="true"]`(回头客「續攤(已叹 N/10)」)vs `[data-returning="false"]`(新客「開市」)。
- `.enter-cta` 的内部是一个 `<a href="/play">`,链接视觉建议用 `.enter-cta a` 来写(`.enter-cta` 本身是外层 `motion.div`,不是 `<a>`)。
- `.how-step[data-step="1|2|3"]` —— DOM 上是字符串 `"1"`/`"2"`/`"3"`,可以按步给不同强调色。

## 调性参考(执行你说了算)

港式茶楼门面、有趣、动画充足;hero 要有"推门入茶楼/一盅两件"的第一印象;长滚动 onboarding 节奏明快;菜单墙像茶楼菜单/印仔簿。具体美术、配色、字体随你 —— 字体变量已备好:`--font-noto-hk`(Noto Sans HK,覆盖粤字)、`--font-geist-sans`、`--font-geist-mono`,用哪套你定。

## 怎么预览

```bash
npm run dev
```
- http://localhost:3000 —— landing(`/`)
- http://localhost:3000/play —— 游戏
- 改 `globals.css` 热更新即见。现在打开是"骨架 + emoji + motion 淡入、没上妆"的样子,正常。

## 完整 class/prop/data 清单

见 [`docs/INTEGRATION.md`](./INTEGRATION.md) 的「Landing 门面契约」表(已逐字核对过和真实组件一致)。有问题找逻辑侧(我)。
