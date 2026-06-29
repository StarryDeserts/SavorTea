# 叹茶 · 虛擬茶樓 —— Landing 门面 + Onboarding 设计

> **状态:** 设计已与产品负责人确认(2026-06-29)。下一步:`superpowers:writing-plans`。
>
> **本 spec 范围:** landing 门面(`/`)+ 完整 onboarding + 路由迁移(游戏搬到 `/play`)+ `DishIcon` 接线骨架 + `layout.tsx` 小修。
>
> **明确不在本 spec(= phase 2):** 游戏页 `/play` 的响应式双栏重做、游戏内互动增强、10 个茶点 SVG 的实际绘制。本 spec 只把 SVG 的"接口"留好(`DishIcon` + 空映射 + emoji 回退),phase 2 填图即升级。

## 1. 背景与目标

现状:整个产品只有一个路由 `/`,页面是一个竖直堆叠的 `<main className="teahouse">`(h1 + `OrderChat` + `StampBook` + `ShareCardButton`),`body` 仅 `flex flex-col`,没有布局系统,移动端窄屏样式,缺少门面与视觉识别度。

目标:做一个**有趣、动画充足、响应式**的 landing 页充当游戏门面与入口,承载 onboarding(招牌 hero、玩法三步、10 道点心菜单墙预览、文化引子),点「開市」进入游戏。提升黑客松 demo 的第一印象与可录制性。

## 2. 全局约束 (Global Constraints)

- **技术栈:** Next.js 16(App Router, Turbopack)、React 19、TypeScript、Tailwind 4、Zustand ^5 + persist。
- **新增依赖:** `motion`(Framer Motion 的 React 19 兼容发行版,`import { motion } from "motion/react"`)。仅此一个新依赖。
- **persist key 不变:** `tan-cha-store`,version 1。store 形状与现有 `clearLevel/addMessage/reset` 不改。
- **安全:** landing 纯前端,不触碰任何密钥/网络。`DEEPSEEK_API_KEY` 仍只在 server 端(`lib/conversation/deepseek.ts` + `app/api/chat/route.ts`),与本 spec 无交集。
- **单一数据源:** 点心数据只在 `lib/dishes/data.ts`(`DISHES`),landing 一律从这里读。
- **文案语言:** 产品/角色文案用地道粤文(用 係/唔/嘅/咗/喺/嚟/俾,不用書面語 的/了/是/我們);技术说明不混粤。
- **不改游戏组件对外契约:** `OrderChat`(无 props)、`StampBook`(`{ dishes, stampedDishIds }`)、`ShareCardButton`(无 props)的 props/class 名保持原样,仅换托管路由。
- **分工:** 见 §8。结构/路由/数据绑定/motion 编排 = 本工作流;静态视觉 CSS、hero 美术、10 个 SVG = open-design。

## 3. 路由与文件结构

| 路由 | 内容 | 改动 |
|---|---|---|
| `/` | 新 landing(长滚动 onboarding) | `app/page.tsx` 重写为 landing 组合根 |
| `/play` | 现游戏(`OrderChat` + `StampBook` + `ShareCardButton`) | 现 `app/page.tsx` 的游戏 JSX 搬到新建 `app/play/page.tsx`,**游戏组件零改动** |

**新建文件:**
- `app/play/page.tsx` —— 游戏页(从现 `app/page.tsx` 平移)。
- `components/DishIcon.tsx` —— 共享点心图标(SVG 映射 + emoji 回退)。
- `components/landing/LandingHero.tsx`
- `components/landing/HowToPlay.tsx`
- `components/landing/MenuWall.tsx`
- `components/landing/CulturalIntro.tsx`
- `components/landing/EnterCta.tsx`

**修改文件:**
- `app/page.tsx` —— 重写为 landing 组合根。
- `app/layout.tsx` —— `lang="en"→"zh-HK"`;用 `next/font/google` 接入 **Noto Sans HK**(CJK,覆盖粵語用字)作为一个 CSS 变量并挂到 `<html>`(与现有 Geist 变量并存);**最终用哪族、如何配色由 open-design 在 CSS 决定**,本工作流只保证该变量可用。
- `docs/INTEGRATION.md` —— 追加 landing 组件契约 + motion/CSS 边界 + SVG 交付格式。

## 4. 组件契约(open-design 据此填视觉)

> 约定:本工作流提供语义化结构 + class + `data-*` + 数据绑定 + motion 编排;open-design 只写 CSS(颜色/排版/间距/装饰)与 SVG。**class 名与 data 属性是契约,双方都不得擅改。**

### 4.1 `DishIcon`
- **Props:** `{ dish: Dish; className?: string }`
- **行为:** 查内部映射 `DISH_SVGS: Record<string, React.ReactNode>`(本 spec 内为空对象);命中渲染对应 SVG,未命中回退 `<span className="dish-emoji" aria-hidden>{dish.emoji}</span>`。
- **外层:** `<span className="dish-icon" data-dish-id={dish.id}>…</span>`,合并传入 `className`。
- **目的:** 让菜单墙(及 phase 2 的印仔簿、分享卡)统一通过一个组件取图;phase 2 往 `DISH_SVGS` 填 10 个 SVG 即全站升级,零结构改动。

### 4.2 `LandingHero`
- **Props:** 无。
- **内容:** 招牌标题「叹茶 · 虛擬茶樓」+ slogan + 一个 `EnterCta`(主入口)。
- **Class:** `.landing-hero` / `.landing-hero-title` / `.landing-hero-slogan`。
- **motion:** 挂载入场(标题、slogan、CTA 依次淡入上移)。

### 4.3 `HowToPlay`
- **Props:** 无(静态文案)。
- **内容:** 三步图解,每步一个图标 + 标题 + 说明(文案见 §7)。图标用 emoji 占位(`①开口嗌`用 🗣️ / `②姨应你`用 💬 / `③盖印仔`用一个 `DishIcon` 或印章 emoji)。
- **Class:** `.how-to-play` / `.how-step`(带 `data-step="1|2|3"`)/ `.how-step-icon` / `.how-step-title` / `.how-step-desc`。
- **motion:** `whileInView` 进视口时三步交错(stagger)浮入。

### 4.4 `MenuWall`
- **Props:** `{ dishes: Dish[]; clearedDishIds: string[]; stars: Record<string, number> }`(形状对齐 store 与 `StampBook` 的 `stampedDishIds` 风格)。
- **行为:** `dishes.map` 渲染 10 格;每格 `cleared = clearedDishIds.includes(dish.id)`,`filled = stars[dish.id] ?? 0`。
- **每格内容:** `DishIcon` + 粤文名 + 状态:已叹显示 ★(复用游戏的 `.stars`/`.star[data-filled]` 标记)+「叹咗」;未叹显示「未叹」。
- **Class:** `.menu-wall` / `.menu-dish`(带 `data-cleared={cleared}`)/ `.menu-dish-icon` / `.menu-dish-name` / `.menu-dish-status`;星星复用 `.stars` 容器 + `.star`(`data-filled` 1/0)。
- **motion:** `whileInView` 逐格交错浮入。

### 4.5 `CulturalIntro`
- **Props:** 无。
- **内容:** 一段茶楼文化短文(粤文,见 §7)。
- **Class:** `.cultural-intro` / `.cultural-intro-body`。
- **motion:** `whileInView` 淡入。

### 4.6 `EnterCta`
- **Props:** `{ clearedCount: number; total: number }`。
- **行为:** 渲染 `next/link` 的 `<Link href="/play">`;`clearedCount === 0` → 文案「開市」;`clearedCount > 0` → 「續攤(已叹 {clearedCount}/{total})」。
- **Class:** `.enter-cta`,带 `data-returning={clearedCount > 0}`。
- **motion:** hover/tap 轻微缩放 + 持续呼吸(`animate` loop)。

## 5. 数据流

```
useTeahouseStore (clearedDishIds, stars)
        │  (在 app/page.tsx 组合根读取)
        ▼
app/page.tsx (landing)
   ├─ LandingHero  └─ EnterCta { clearedCount: clearedDishIds.length, total: DISHES.length }
   ├─ HowToPlay
   ├─ MenuWall { dishes: DISHES, clearedDishIds, stars }
   ├─ CulturalIntro
   └─ EnterCta(底部复用,同上 props)
```

- 叶子组件(`MenuWall`/`EnterCta`)**纯 props 驱动、可单测**;只有组合根 `app/page.tsx` 读 store(沿用现有 `page.tsx` 读 store 传 `StampBook` 的模式)。
- `app/page.tsx` 与 `app/play/page.tsx` 均为 `'use client'`(需 store + motion + 交互)。

## 6. 动画(motion)方案 + 与 CSS 的边界

**为什么 motion:** 产品要"动画特效充足",`whileInView` 交错入场、`AnimatePresence`、hover/tap、呼吸循环用 motion 表达远比手写 CSS 编排清晰。代价是动画编排进入 React 组件 —— 因此必须与 open-design 的 CSS 划清边界:

| 谁 | 管什么 | 不碰什么 |
|---|---|---|
| 本工作流(motion) | 包裹元素的 `transform`(平移/缩放)、`opacity`、入场/滚动/交错/呼吸编排、`AnimatePresence` | 颜色、背景、字体、间距、边框、阴影 |
| open-design(CSS) | 所有静态视觉;**装饰性循环动画**(热气、微光、渐变流动)放在**子元素/伪元素**上 | 不得对 motion 控制的包裹元素再写 `transform`/`transition: transform`(会与 motion 内联样式打架) |

**规则一句话:** motion 拥有"会动的那层包裹"的 transform/opacity;open-design 给这层盒子上色、排版,并把任何会动的装饰挂到它的子节点或 `::before/::after`,不去动包裹层的位移。

**进入转场(`/`→`/play`):** 既选独立路由(非 View Transitions),做轻量即可 —— `/play` 用 `app/play/template.tsx`(或页面挂载时)做 motion 入场;「開市」点击的退场/门帘特效作为锦上添花,不阻塞本 spec 验收。

## 7. 文案草稿(粤文,最终可由 open-design/产品润色)

- **Hero slogan:** 「一盅兩件,開口就嗌 —— 同點心姨用粵語飲返餐靚茶。」
- **玩法三步:**
  1. **開口嗌** —— 諗住想食乜,直接講(或者打字)俾點心姨聽。
  2. **姨應你** —— 點心姨用粵語應你,仲會評下你講得幾「地道」(★1–3)。
  3. **蓋印仔** —— 嗌啱就蓋個印仔,儲齊十道,得張「今日飲茶」分享卡。
- **文化引子:** 「飲茶唔淨係食點心。一盅兩件、揭盅斟茶、講聲『唔該』—— 茶樓裡頭每個細節,都係廣府人嘅生活味道。入嚟坐低,慢慢嘆。」
- **CTA:** 「開市」/ 回頭客「續攤(已叹 N/10)」。
- **菜单墙状态:** 已叹「叹咗」+ ★;未叹「未叹」。

## 8. 分工与 `INTEGRATION.md` 更新

**本工作流交付(逻辑/结构):** 路由迁移、`app/play/page.tsx`、5 个 landing 组件骨架(class + `data-*` + 数据/store 绑定)、`DishIcon`(+ 空映射 + emoji 回退)、`EnterCta` 导航、motion 编排、`layout.tsx` 字体变量 + `lang=zh-HK`、更新 `docs/INTEGRATION.md`、对应单测。

**open-design 交付(视觉):** landing 全部静态视觉 CSS、hero 美术、动画装饰(按 §6 边界)、响应式视觉、10 个茶点 SVG(phase 2)。

**`INTEGRATION.md` 追加:**
- §4 全部组件契约表(class/prop/`data-*`)。
- §6 的 motion ↔ CSS 边界规则。
- **SVG 交付格式:** 扁平 2–3 色图标风;统一 `viewBox="0 0 64 64"`;不写死 `width/height`(由 CSS 控制尺寸);尽量用 `currentColor` 便于主题着色;以可直接放进 `DISH_SVGS` 映射的 `<svg>` 片段或 React 组件交付,键为 `dish.id`。

## 9. 响应式骨架

- 本工作流搭**结构骨架**:语义化 section + 容器 + Tailwind 断点类标出"桌面 vs 移动"的切换点(如菜单墙 `grid` 列数随宽度变、内容最大宽度居中 + 大留白)。
- open-design 定**视觉响应式**:实际间距、字阶、hero 宽屏铺陈。
- Landing 为长滚动;桌面端核心是"内容居中 + 留白 + 菜单墙多列网格",移动端收为单列。

## 10. 测试(只测逻辑,纯视觉不测)

- `DishIcon`:未映射时渲染该 dish 的 emoji 回退(断言 emoji 文本 + `data-dish-id`)。
- `MenuWall`:给定 `clearedDishIds`/`stars`,已叹格 `data-cleared="true"` 且填充星数正确、显示「叹咗」;未叹格 `data-cleared="false"`、显示「未叹」。
- `EnterCta`:`clearedCount=0` → 文案含「開市」、`href="/play"`;`clearedCount=3,total=10` → 含「續攤」「3/10」、`data-returning="true"`。
- `app/play/page.tsx`:渲染冒烟 —— 游戏面(`OrderChat`)在场。
- 全量 `tsc --noEmit` 与 `npm test` 在每个相关任务后保持绿。

## 11. 非目标 / 范围边界

- 不重做 `/play` 的视觉与布局(phase 2)。
- 不实际绘制 10 个 SVG(phase 2;本 spec 只留接口 + 回退)。
- 不改 store 形状、persist key、游戏判定逻辑、`/api/chat`。
- 不引入除 `motion` 以外的新依赖。
