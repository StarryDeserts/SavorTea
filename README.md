# 叹茶 · 虚拟茶楼 — SavorTea

> 在一间虚拟茶楼里,用**粤语**点心 —— 点心姨会看你点得有多「地道」,集齐十道点心。
> A voice-driven Cantonese dim-sum ordering game.

**🎯 AI DimSum 黑客松第五期 · 粤语饮食文化赛道**

**▶️ 在线体验:** https://starrydeserts.github.io/SavorTea/

---

## 这是什么

在一间**虚拟茶楼**里,「点心姨」会一道一道地给你目标(例如:用粤语向她点一笼虾饺)。你**开口用粤语点单**(语音或打字)—— 点对了就**盖一个印章**、拿到 1–3 颗「地道」星;从虾饺一路点到艇仔粥,集齐十道就生成一张「今日饮茶」成绩卡。

边玩边练粤语的饮食用语:点心名、量词、礼貌说法、识别别名、问价、结账…… 一共 **8 个技能阶梯**、**10 道经典点心**。

## 判分是怎么做的(核心设计)

判分是**两层**的 —— 这是本项目最关键的设计:

1. **确定性判定(离线、权威):** `lib/game/checker.ts` 的 `checkOrder()` 是纯前端逻辑,不依赖任何大模型,**独立决定**你过不过关(配合繁/简正规化、别名、量词、做法等规则)。
2. **大模型(只负责「演」):** 过关之后,才让大模型扮演点心姨,说一句地道的粤语回应、评「地道度」星数、给提示。

**所以大模型只是演员,不掌生杀** —— 就算模型乱说,也改不了你过不过关。没填 key、或模型连不上,游戏照样能玩(走确定性兜底台词)。

## 🔑 自带 API Key(BYOK)· 你的 Key 永远不离开你的设备

这是一个**纯静态**网站,**没有后端**。想让点心姨的回应更生动,去 `/settings` 填你自己的 **OpenAI 兼容** `{baseURL, apiKey, model}`(DeepSeek / OpenAI / Moonshot / 通义 / 自定义):

- Key 只保存在**你浏览器的 localStorage**;
- 判分时由**浏览器直接连接你选择的服务商**,**绝不经过任何服务器**、不上传、不记录日志;
- 不填 Key 也能玩(点心姨走确定性兜底)。

> 因为根本没有服务器,「Key 不会泄漏」这件事是**结构上成立**的 —— 没有任何后端能拿到你的 Key。

## ✨ 功能

- 🎙️ **语音 / 文字点单** —— DimSum 语音转文字(免费、免 key),粤语自由表达。
- 🧠 **混合判定** —— 确定性过关 + 大模型风味,模型骗不过判定。
- 🀄 **繁 / 简兼容** —— 用 opencc 把语音识别结果正规化,「虾饺 / 蝦餃」都认得。
- 🥟 **十道点心 SVG + 集印章** —— 手绘描边图标,点一道盖一道。
- 🪪 **「今日饮茶」分享卡** —— 用 canvas 生成成绩单 PNG。
- ⚙️ **BYOK 设置页** —— 服务商预设 + 连接测试,简体中文、简单易懂。
- 🎨 **港式茶楼视觉** —— 红绒 × 竹白 × 茶汤金,牌匾招牌、红印章、蒸笼热气。

## 🧱 技术栈

- **Next.js 16**(App Router,**静态导出** `output: 'export'`)· **React 19** · **TypeScript**
- **Tailwind CSS 4** · **Zustand**(持久化)· **motion**(Framer Motion)· **opencc-js**
- **DimSum** 粤语语音识别(公开、免 key)
- **Vitest** + Testing Library(101 个测试)
- 部署:**100% 静态 → GitHub Pages**(GitHub Actions 自动构建、部署)

## 🚀 本地运行

```bash
npm install
npm run dev          # 打开 http://localhost:3000
```

其他命令:

```bash
npm test             # 跑测试
npm run build        # 静态导出到 out/
```

> 本地开发**不需要任何 API key** —— 直接玩(走确定性兜底);想体验大模型风味,就在 `/settings` 填你自己的 key。

## 🌐 部署(GitHub Pages)

项目是纯静态的,`npm run build` 会把站点导出到 `out/`。仓库已配好 `.github/workflows/deploy.yml`:**只要 push 到 `main` / `master`,就自动构建并部署到 GitHub Pages**。

一次性设置:仓库 **Settings → Pages → Source 选「GitHub Actions」**(本仓库已开启)。`basePath` 会在 CI 中自动设为 `/SavorTea`。

## 🗂️ 目录结构

```
app/            路由:/(首页)、/play(游戏)、/settings(BYOK 设置)
components/     OrderChat、VoiceOrderButton、StampBook、DishIcon、ShareCardButton、landing/*
lib/
  game/         checker.ts(确定性判定)、vocab.ts
  conversation/ engine.ts(BYOK 判分)、openaiCompatible.ts、prompt.ts、judge.ts
  settings/     llmConfigStore.ts、providers.ts、llmConfig.ts
  dishes/       data.ts(十道点心,单一数据源)
  share/        shareCard.ts(canvas 分享卡)
docs/INTEGRATION.md   组件 class/prop/data 契约(视觉与逻辑的分工接口)
uiux-design/    高保真视觉稿(landing / play / settings / 点心 SVG)
```

## 🙏 鸣谢

- **DimSum / NonceGeek** —— 粤语语料、语音识别等公开能力。
- 视觉设计由 **open-design** 出稿;逻辑、工程与整合自建(分工见 `docs/INTEGRATION.md`)。

---

为广府茶楼文化而做 🍵 · AI DimSum Hackathon #5
