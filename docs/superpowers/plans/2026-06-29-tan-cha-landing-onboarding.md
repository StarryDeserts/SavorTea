# Landing 门面 + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给「叹茶 · 虛擬茶樓」加一个动画充足、响应式的 landing 门面(`/`)作为游戏入口,游戏迁到 `/play`。

**Architecture:** 先用 TDD 建好叶子组件(`DishIcon` + 4 个 landing 组件),它们不触碰现有 `/` 路由、app 全程可用;最后一个集成任务把游戏平移到 `/play`、把 `/` 重写成 landing 组合根、改 `layout`、更新契约文档。动画用 `motion`(Framer Motion 的 React 19 包),`whileInView` 做滚动入场。点心图标走 `DishIcon`(空 SVG 映射 + emoji 回退),phase 2 填 SVG 即升级。

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Zustand ^5 · **motion**(新增)· Vitest 4 + @testing-library/react (jsdom)。

## Global Constraints

- 新增依赖**仅** `motion`(`import { motion } from "motion/react"`);不引入其它库。
- persist key `tan-cha-store`(version 1)与 store 形状(`clearedDishIds: string[]`、`stars: Record<string, number>`、`currentLevel`、`clearLevel/addMessage/reset`)**一律不改**。
- 不改游戏组件对外契约:`OrderChat`(无 props)、`StampBook`(`{ dishes: Dish[]; stampedDishIds: string[] }`)、`ShareCardButton`(无 props);只换托管路由。
- 点心数据单一来源 `lib/dishes/data.ts`(`DISHES`),landing 一律从这里读。
- 产品/角色文案用地道粤文(用 係/唔/嘅/咗/喺/嚟/俾,**不用** 書面語 的/了/是/我們)。
- 不写最终视觉 CSS、不画 SVG —— 那是 open-design 的活;本计划只交付结构 + class + `data-*` + motion 编排 + 数据绑定 + 契约文档。
- landing 纯前端,不碰任何密钥/网络;`DEEPSEEK_API_KEY` 仍只在 server 端。
- class 名与 `data-*` 是给 open-design 的契约,实现时**严格按本计划的字符串**,不得改名。
- 每个任务结束 `npx tsc --noEmit` 必须 GREEN,`npm test` 必须全绿。

---

### Task 1: `DishIcon` 共享点心图标

**Files:**
- Create: `components/DishIcon.tsx`
- Test: `components/DishIcon.test.tsx`

**Interfaces:**
- Consumes: `Dish` from `@/lib/dishes/types`(字段:`id: string`、`emoji: string`、`nameYue: string` 等);`DISHES` from `@/lib/dishes/data`。
- Produces: `DishIcon({ dish: Dish; className?: string })` —— 渲染 `<span class="dish-icon" data-dish-id={dish.id}>`,内部命中 `DISH_SVGS[dish.id]` 则渲染 SVG,否则回退 `<span class="dish-emoji" aria-hidden>{dish.emoji}</span>`。后续 `MenuWall` 依赖它。

- [ ] **Step 1: 写失败测试**

`components/DishIcon.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DishIcon } from '@/components/DishIcon';
import { DISHES } from '@/lib/dishes/data';

describe('DishIcon', () => {
  it('falls back to the dish emoji when no SVG is mapped', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow')!;
    const { container } = render(<DishIcon dish={harGow} />);
    expect(screen.getByText('🦐')).toBeInTheDocument();
    expect(container.querySelector('[data-dish-id="har-gow"]')).toBeInTheDocument();
  });

  it('merges an extra className onto the wrapper', () => {
    const harGow = DISHES.find((d) => d.id === 'har-gow')!;
    const { container } = render(<DishIcon dish={harGow} className="big" />);
    expect(container.querySelector('.dish-icon.big')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run components/DishIcon.test.tsx`
Expected: FAIL —— `Failed to resolve import "@/components/DishIcon"`。

- [ ] **Step 3: 写最小实现**

`components/DishIcon.tsx`:

```tsx
import type { ReactNode } from 'react';
import type { Dish } from '@/lib/dishes/types';

// Phase 2: open-design 往这里按 dish.id 填 <svg>;在此之前每道都回退 emoji。
const DISH_SVGS: Record<string, ReactNode> = {};

export function DishIcon({ dish, className }: { dish: Dish; className?: string }) {
  const svg = DISH_SVGS[dish.id];
  return (
    <span className={`dish-icon${className ? ` ${className}` : ''}`} data-dish-id={dish.id}>
      {svg ?? (
        <span className="dish-emoji" aria-hidden>
          {dish.emoji}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run components/DishIcon.test.tsx`
Expected: PASS(2 passed)。

- [ ] **Step 5: tsc + 提交**

```bash
npx tsc --noEmit
git add components/DishIcon.tsx components/DishIcon.test.tsx
git commit -m "feat: add DishIcon with emoji fallback and empty SVG map"
```

---

### Task 2: 装 `motion` + 测试环境垫片 + `EnterCta`

**Files:**
- Modify: `package.json`(`npm i motion` 自动改)
- Modify: `vitest.setup.ts`(加 `IntersectionObserver` / `matchMedia` 垫片)
- Create: `components/landing/EnterCta.tsx`
- Test: `components/landing/EnterCta.test.tsx`

**Interfaces:**
- Consumes: `motion` from `motion/react`;`Link` from `next/link`。
- Produces: `EnterCta({ clearedCount: number; total: number })` —— 渲染 `<motion.div class="enter-cta" data-returning={clearedCount>0}>` 包一个 `<Link href="/play">`;`clearedCount===0` 文案「開市」,否则「續攤(已叹 {clearedCount}/{total})」。`LandingHero` 与 landing 页都会用它。

- [ ] **Step 1: 安装 motion**

Run: `npm i motion`
Expected: `package.json` 的 `dependencies` 出现 `"motion"`;`npm test` 现有用例仍可跑。

- [ ] **Step 2: 给 jsdom 加 motion 需要的全局垫片**

把 `vitest.setup.ts` 整个替换为:

```ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom 没有这两个,但 motion 的 whileInView / 减弱动效查询会用到。
if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // @ts-expect-error minimal stub for tests
  globalThis.IntersectionObserver = IntersectionObserverStub;
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}
```

- [ ] **Step 3: 写失败测试**

`components/landing/EnterCta.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';

// next/link 在 App Router 单测里会找 router context;用一个渲染 <a> 的桩替掉。
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { EnterCta } from '@/components/landing/EnterCta';

describe('EnterCta', () => {
  it('shows 開市 and links to /play for a fresh visitor', () => {
    render(<EnterCta clearedCount={0} total={10} />);
    const link = screen.getByRole('link', { name: '開市' });
    expect(link).toHaveAttribute('href', '/play');
  });

  it('shows 續攤 with progress for a returning visitor', () => {
    const { container } = render(<EnterCta clearedCount={3} total={10} />);
    expect(screen.getByRole('link', { name: /續攤/ })).toBeInTheDocument();
    expect(screen.getByText(/3\/10/)).toBeInTheDocument();
    expect(container.querySelector('.enter-cta[data-returning="true"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 跑测试,确认失败**

Run: `npx vitest run components/landing/EnterCta.test.tsx`
Expected: FAIL —— `Failed to resolve import "@/components/landing/EnterCta"`。

- [ ] **Step 5: 写最小实现**

`components/landing/EnterCta.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export function EnterCta({ clearedCount, total }: { clearedCount: number; total: number }) {
  const returning = clearedCount > 0;
  const label = returning ? `續攤(已叹 ${clearedCount}/${total})` : '開市';
  return (
    <motion.div
      className="enter-cta"
      data-returning={returning}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      <Link href="/play">{label}</Link>
    </motion.div>
  );
}
```

- [ ] **Step 6: 跑测试,确认通过**

Run: `npx vitest run components/landing/EnterCta.test.tsx`
Expected: PASS(2 passed)。

- [ ] **Step 7: 全量回归 + tsc + 提交**

```bash
npx tsc --noEmit
npm test
git add package.json package-lock.json vitest.setup.ts components/landing/EnterCta.tsx components/landing/EnterCta.test.tsx
git commit -m "feat: add motion dep, jsdom motion shims, and EnterCta"
```

Expected: `npm test` 全绿(现有用例 + EnterCta)。

---

### Task 3: `MenuWall` 菜单墙(反映进度)

**Files:**
- Create: `components/landing/MenuWall.tsx`
- Test: `components/landing/MenuWall.test.tsx`

**Interfaces:**
- Consumes: `motion` from `motion/react`;`Dish` from `@/lib/dishes/types`;`DishIcon` from `@/components/DishIcon`(Task 1);`DISHES`。`IntersectionObserver` 垫片来自 Task 2。
- Produces: `MenuWall({ dishes: Dish[]; clearedDishIds: string[]; stars: Record<string, number> })` —— 渲染 `<ul class="menu-wall">`,每道 `<motion.li class="menu-dish" data-cleared={bool}>`;已叹显示 `.stars`(三颗 `.star[data-filled]`),未叹显示 `.menu-dish-todo`「未叹」。

- [ ] **Step 1: 写失败测试**

`components/landing/MenuWall.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MenuWall } from '@/components/landing/MenuWall';
import { DISHES } from '@/lib/dishes/data';

describe('MenuWall', () => {
  it('renders every dish name', () => {
    render(<MenuWall dishes={DISHES} clearedDishIds={[]} stars={{}} />);
    for (const d of DISHES) {
      expect(screen.getByText(d.nameYue)).toBeInTheDocument();
    }
  });

  it('marks cleared dishes and shows their best star count', () => {
    const { container } = render(
      <MenuWall dishes={DISHES} clearedDishIds={['har-gow']} stars={{ 'har-gow': 2 }} />,
    );
    const harGow = container.querySelector('.menu-dish[data-cleared="true"]');
    expect(harGow).toBeInTheDocument();
    expect(harGow!.querySelectorAll('.star[data-filled="true"]').length).toBe(2);
    expect(harGow!.querySelector('.star[data-filled="false"]')).toBeInTheDocument();
  });

  it('shows 未叹 for every dish not yet cleared', () => {
    render(<MenuWall dishes={DISHES} clearedDishIds={['har-gow']} stars={{ 'har-gow': 2 }} />);
    expect(screen.getAllByText('未叹').length).toBe(DISHES.length - 1);
  });
});
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run components/landing/MenuWall.test.tsx`
Expected: FAIL —— `Failed to resolve import "@/components/landing/MenuWall"`。

- [ ] **Step 3: 写最小实现**

`components/landing/MenuWall.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';
import type { Dish } from '@/lib/dishes/types';
import { DishIcon } from '@/components/DishIcon';

export function MenuWall({
  dishes,
  clearedDishIds,
  stars,
}: {
  dishes: Dish[];
  clearedDishIds: string[];
  stars: Record<string, number>;
}) {
  const cleared = new Set(clearedDishIds);
  return (
    <ul className="menu-wall">
      {dishes.map((dish, i) => {
        const got = cleared.has(dish.id);
        const filled = stars[dish.id] ?? 0;
        return (
          <motion.li
            key={dish.id}
            className="menu-dish"
            data-cleared={got}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <DishIcon dish={dish} className="menu-dish-icon" />
            <span className="menu-dish-name">{dish.nameYue}</span>
            <span className="menu-dish-status">
              {got ? (
                <span className="stars" aria-label={`${dish.nameYue} 叹咗 ${filled} 粒星`}>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className="star" data-filled={n <= filled} aria-hidden>
                      ★
                    </span>
                  ))}
                </span>
              ) : (
                <span className="menu-dish-todo">未叹</span>
              )}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run components/landing/MenuWall.test.tsx`
Expected: PASS(3 passed)。

- [ ] **Step 5: tsc + 提交**

```bash
npx tsc --noEmit
git add components/landing/MenuWall.tsx components/landing/MenuWall.test.tsx
git commit -m "feat: add MenuWall reflecting cleared/stars progress"
```

---

### Task 4: 静态分区 —— `LandingHero` / `HowToPlay` / `CulturalIntro`

> **为何无单测:** 这三个是纯展示组件(静态文案 + class 契约 + motion 入场),没有分支逻辑。它们的渲染由 Task 5 的 landing 组合冒烟测试覆盖(断言各区关键文案在场),在此再写渲染测试只是重复。`tsc` 保证类型对接。

**Files:**
- Create: `components/landing/LandingHero.tsx`
- Create: `components/landing/HowToPlay.tsx`
- Create: `components/landing/CulturalIntro.tsx`

**Interfaces:**
- Consumes: `motion` from `motion/react`;`EnterCta` from `@/components/landing/EnterCta`(Task 2)。
- Produces:
  - `LandingHero({ clearedCount: number; total: number })` —— `<section class="landing-hero">`,含 `.landing-hero-title`、`.landing-hero-slogan`,内嵌 `<EnterCta clearedCount total />`。
  - `HowToPlay()`(无 props)—— `<section class="how-to-play">`,三个 `.how-step[data-step="1|2|3"]`(`.how-step-icon` / `.how-step-title` / `.how-step-desc`)。
  - `CulturalIntro()`(无 props)—— `<section class="cultural-intro">` 含 `.cultural-intro-body`。

- [ ] **Step 1: 写 `LandingHero`**

`components/landing/LandingHero.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';
import { EnterCta } from '@/components/landing/EnterCta';

export function LandingHero({ clearedCount, total }: { clearedCount: number; total: number }) {
  return (
    <section className="landing-hero">
      <motion.h1
        className="landing-hero-title"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        叹茶 · 虛擬茶樓
      </motion.h1>
      <motion.p
        className="landing-hero-slogan"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        一盅兩件,開口就嗌 —— 同點心姨用粵語飲返餐靚茶。
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <EnterCta clearedCount={clearedCount} total={total} />
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: 写 `HowToPlay`**

`components/landing/HowToPlay.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

const STEPS = [
  { n: 1, icon: '🗣️', title: '開口嗌', desc: '諗住想食乜,直接講(或者打字)俾點心姨聽。' },
  { n: 2, icon: '💬', title: '姨應你', desc: '點心姨用粵語應你,仲會評下你講得幾「地道」(★1–3)。' },
  { n: 3, icon: '🥟', title: '蓋印仔', desc: '嗌啱就蓋個印仔,儲齊十道,得張「今日飲茶」分享卡。' },
] as const;

export function HowToPlay() {
  return (
    <section className="how-to-play">
      {STEPS.map((s, i) => (
        <motion.div
          key={s.n}
          className="how-step"
          data-step={s.n}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        >
          <span className="how-step-icon" aria-hidden>
            {s.icon}
          </span>
          <h3 className="how-step-title">{s.title}</h3>
          <p className="how-step-desc">{s.desc}</p>
        </motion.div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: 写 `CulturalIntro`**

`components/landing/CulturalIntro.tsx`:

```tsx
'use client';

import { motion } from 'motion/react';

export function CulturalIntro() {
  return (
    <motion.section
      className="cultural-intro"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
    >
      <p className="cultural-intro-body">
        飲茶唔淨係食點心。一盅兩件、揭盅斟茶、講聲「唔該」—— 茶樓裡頭每個細節,都係廣府人嘅生活味道。入嚟坐低,慢慢嘆。
      </p>
    </motion.section>
  );
}
```

- [ ] **Step 4: tsc + 提交**

```bash
npx tsc --noEmit
git add components/landing/LandingHero.tsx components/landing/HowToPlay.tsx components/landing/CulturalIntro.tsx
git commit -m "feat: add static landing sections (hero, how-to-play, cultural intro)"
```

Expected: `tsc` 无错(三组件引用的 `EnterCta`/`motion` 均已存在)。

---

### Task 5: 路由迁移 + 上线(游戏搬到 `/play`、`/` 变 landing、`layout` 字体)

> 这是"让它活起来"的集成任务:把现游戏平移到 `/play`,把 `/` 重写成 landing 组合根,并把 `layout` 的 `lang` 与 CJK 字体接好。两个页面各加一个冒烟测试。

**Files:**
- Create: `app/play/page.tsx`
- Create: `app/play/page.test.tsx`
- Modify: `app/page.tsx`(重写为 landing)
- Create: `app/page.test.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `useTeahouseStore`(`clearedDishIds`、`stars`);`DISHES`;`OrderChat`/`StampBook`/`ShareCardButton`(不改);Task 2–4 的 `LandingHero`/`HowToPlay`/`MenuWall`/`CulturalIntro`/`EnterCta`。
- Produces: 路由 `/`(landing)与 `/play`(游戏)。

- [ ] **Step 1: 把游戏平移到 `app/play/page.tsx`**

`app/play/page.tsx`(内容等同当前 `app/page.tsx`):

```tsx
'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { OrderChat } from '@/components/OrderChat';
import { StampBook } from '@/components/StampBook';
import { ShareCardButton } from '@/components/ShareCardButton';

export default function PlayPage() {
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const allCleared = clearedDishIds.length >= DISHES.length;

  return (
    <main className="teahouse">
      <h1>叹茶 · 虛擬茶樓</h1>
      <OrderChat />
      <StampBook dishes={DISHES} stampedDishIds={clearedDishIds} />
      {allCleared && <ShareCardButton />}
    </main>
  );
}
```

- [ ] **Step 2: `/play` 冒烟测试**

`app/play/page.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayPage from '@/app/play/page';

describe('PlayPage (/play)', () => {
  it('renders the game surface (stamp book)', () => {
    render(<PlayPage />);
    expect(screen.getByLabelText('蝦餃 未蓋章')).toBeInTheDocument();
  });
});
```

Run: `npx vitest run app/play/page.test.tsx`
Expected: PASS(1 passed)。

- [ ] **Step 3: 把 `app/page.tsx` 重写为 landing 组合根**

`app/page.tsx`:

```tsx
'use client';

import { useTeahouseStore } from '@/lib/store/teahouseStore';
import { DISHES } from '@/lib/dishes/data';
import { LandingHero } from '@/components/landing/LandingHero';
import { HowToPlay } from '@/components/landing/HowToPlay';
import { MenuWall } from '@/components/landing/MenuWall';
import { CulturalIntro } from '@/components/landing/CulturalIntro';
import { EnterCta } from '@/components/landing/EnterCta';

export default function LandingPage() {
  const clearedDishIds = useTeahouseStore((s) => s.clearedDishIds);
  const stars = useTeahouseStore((s) => s.stars);
  const total = DISHES.length;
  const clearedCount = clearedDishIds.length;

  return (
    <main className="landing">
      <LandingHero clearedCount={clearedCount} total={total} />
      <HowToPlay />
      <MenuWall dishes={DISHES} clearedDishIds={clearedDishIds} stars={stars} />
      <CulturalIntro />
      <EnterCta clearedCount={clearedCount} total={total} />
    </main>
  );
}
```

- [ ] **Step 4: landing 冒烟测试**

`app/page.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

describe('LandingPage (/)', () => {
  it('renders hero slogan, how-to-play, menu wall, cultural intro, and a /play link', () => {
    render(<LandingPage />);
    expect(screen.getByText(/開口就嗌/)).toBeInTheDocument(); // hero slogan
    expect(screen.getByText('開口嗌')).toBeInTheDocument(); // how-step 1 title
    expect(screen.getByText(/廣府人嘅生活味道/)).toBeInTheDocument(); // cultural intro
    expect(screen.getByText('蝦餃')).toBeInTheDocument(); // menu wall
    const playLinks = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/play');
    expect(playLinks.length).toBeGreaterThanOrEqual(1);
  });
});
```

Run: `npx vitest run app/page.test.tsx`
Expected: PASS(1 passed)。

- [ ] **Step 5: 改 `app/layout.tsx`(`lang=zh-HK` + Noto Sans HK 变量)**

把 `app/layout.tsx` 改为:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_HK } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// CJK 字族,覆盖粵語用字。CJK 字体没有小 subset,故 preload:false 以免构建报错。
const notoSansHK = Noto_Sans_HK({
  variable: "--font-noto-hk",
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "叹茶 · 虛擬茶樓",
  description: "同點心姨用地道粵語飲茶嗌點心,練發音、儲印仔、學茶樓文化。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-HK"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansHK.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

> 若 `next build` 仍因字体 subset/preload 报错:确认 `preload: false` 已加;不要加 `subsets`(CJK 无小 subset)。`--font-noto-hk` 变量是否启用、如何配色交给 open-design。

- [ ] **Step 6: 全量回归 + tsc + 构建**

```bash
npx tsc --noEmit
npm test
npm run build
```

Expected: `tsc` 0 错;`npm test` 全绿(含两个新冒烟);`next build` 成功(校验字体配置)。

- [ ] **Step 7: 提交**

```bash
git add app/play/page.tsx app/play/page.test.tsx app/page.tsx app/page.test.tsx app/layout.tsx
git commit -m "feat: split landing (/) and game (/play), wire CJK font + lang"
```

---

### Task 6: 更新 `docs/INTEGRATION.md` 契约(给 open-design)

> 把本次新增的 landing 结构契约写给 open-design:组件 class/prop/`data-*`、motion ↔ CSS 边界、SVG 交付格式。这一任务的 review 重点是**文档与真实组件逐字一致**。

**Files:**
- Modify: `docs/INTEGRATION.md`

**Interfaces:**
- Consumes: Task 1–5 落地的真实 class/prop/`data-*`。
- Produces: 仅文档。

- [ ] **Step 1: 在 `docs/INTEGRATION.md` 末尾追加以下小节**

```markdown
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
```

- [ ] **Step 2: 提交**

```bash
git add docs/INTEGRATION.md
git commit -m "docs: add landing contract (classes, props, motion/CSS boundary, SVG format)"
```

---

## 实现后:收尾

全部任务完成后,用 `superpowers:finishing-a-development-branch` 收尾(验证 `npm test` + `next build` 全绿 → 选择合并到 `master` / 开 PR / 保留 / 丢弃)。手动浏览器 E2E(语音点单、转场、响应式断点目测)仍是人工步骤。
