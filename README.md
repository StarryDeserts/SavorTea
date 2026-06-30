# 叹茶 · 虛擬茶樓 — SavorTea

> 一盅兩件,開口就嗌 —— 同點心姨用**粵語**飲返餐靚茶。
> A voice-driven Cantonese dim-sum ordering game. Order in Cantonese, get judged on how 地道 (authentic) you sound, collect all ten stamps.

**🎯 AI DimSum 黑客松第五期 · 粵語飲食文化賽道**

**▶️ Live demo:** https://starrydeserts.github.io/SavorTea/

---

## 這是乜嘢 / What is it

喺一間**虛擬茶樓**,點心姨會逐道俾你一個目標(例如「用粵語唔該姨嚟一籠蝦餃」)。你**用粵語開口嗌**(語音或打字)—— 嗌啱就**蓋個印仔**、攞 1–3 粒「地道」星;由蝦餃一路叹到艇仔粥,儲齊十道就得張「**今日飲茶**」成績卡。

一邊玩一邊練粵語飲食用語:點心名、量詞、禮貌講法、別名、問價、埋單…… 一共 **8 個技能階梯**、**10 道經典點心**。

## 點樣判分 / How judging works (the interesting part)

判分係**雙層**嘅 —— 呢個係本項目嘅核心設計:

1. **確定性判定(離線、權威):** `lib/game/checker.ts` 嘅 `checkOrder()` 純前端、唔靠任何模型,**獨力決定**你過唔過關(配合繁/簡正規化 + 別名 + 量詞 + 做法等規則)。
2. **大模型(只供風味):** 過關之後,先至叫大模型扮點心姨講返句地道粵文回應、評「地道度」星數同俾提示。

**所以模型只係「演」,唔掌生殺** —— 就算模型亂噏,都改唔到你過唔過關。冇填 key / 模型連唔到,遊戲一樣玩得落(走確定性兜底台詞)。

## 🔑 自帶 API Key(BYOK)· 你嘅 key 永不離開你部機

呢個係**純靜態**網站,**冇後端**。想要點心姨更生動嘅回應,去 `/settings` 填你自己嘅 **OpenAI 兼容** `{baseURL, apiKey, model}`(DeepSeek / OpenAI / Moonshot / 通義 / 自定義):

- key 只存喺**你嘅瀏覽器 localStorage**;
- 判分時由**瀏覽器直連你揀嘅 provider**,**永不經過任何伺服器**、永不上傳、永不 log;
- 冇填 key 都照玩(點心姨走確定性兜底)。

> 因為冇伺服器,「key 唔會洩漏」呢件事係**結構上成立**嘅 —— 根本冇後端可以攞到你嘅 key。

## ✨ 功能 / Features

- 🎙️ **語音/文字點單** —— DimSum ASR 語音轉文字(免費、免 key),粵語自由表達。
- 🧠 **混合判定** —— 確定性過關 + 大模型風味,模型騙唔到過關。
- 🀄 **繁/簡橋接** —— 用 opencc 把 ASR 輸出正規化,蝦餃/虾饺都認得。
- 🥟 **十道點心 SVG + 集印仔** —— 手作描邊圖標,叹一道蓋一道。
- 🪪 **「今日飲茶」分享卡** —— canvas 生成成績單 PNG,叹咗 N 道 · M 粒星。
- ⚙️ **BYOK 設定頁** —— provider 預設 + 連接測試,簡體中文、簡單易懂。
- 🎨 **港式茶樓視覺** —— 紅絨 × 竹白 × 茶湯金,牌匾招牌、紅印章、蒸籠熱氣。

## 🧱 技術棧 / Tech stack

- **Next.js 16** (App Router, **static export** `output: 'export'`) · **React 19** · **TypeScript**
- **Tailwind CSS 4** · **Zustand**(+ persist)· **motion** (Framer Motion) · **opencc-js**
- **DimSum** 粵語 ASR(語音轉文字,公開免 key)
- **Vitest** + Testing Library(101 個測試)
- 部署:**100% 靜態 → GitHub Pages**(GitHub Actions 自動構建部署)

## 🚀 本地運行 / Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

其他指令:

```bash
npm test             # 跑測試
npm run build        # 靜態導出到 out/(output: export)
```

> 本地開發**唔需要任何 API key** —— 直接玩(確定性兜底);想試大模型風味就喺 `/settings` 填你自己嘅 key。

## 🌐 部署 / Deploy (GitHub Pages)

本項目係純靜態,`npm run build` 會導出 `out/`。倉庫已配好 `.github/workflows/deploy.yml`:**push 到 `main`/`master` 就自動構建 + 部署到 GitHub Pages**。

一次性設定:倉庫 **Settings → Pages → Source 選「GitHub Actions」**。`basePath` 喺 CI 入面自動設為 `/SavorTea`。

## 🗂️ 結構 / Structure

```
app/            路由:/ (landing)、/play (遊戲)、/settings (BYOK)
components/     OrderChat、VoiceOrderButton、StampBook、DishIcon、ShareCardButton、landing/*
lib/
  game/         checker.ts(確定性判定)、vocab.ts
  conversation/ engine.ts(BYOK 判分)、openaiCompatible.ts、prompt.ts、judge.ts
  settings/     llmConfigStore.ts、providers.ts、llmConfig.ts
  dishes/       data.ts(十道點心,單一數據源)
  share/        shareCard.ts(canvas 分享卡)
docs/INTEGRATION.md   組件 class/prop/data 契約(視覺與邏輯的分工接口)
uiux-design/    open-design 出嘅高保真視覺稿(landing / play / settings / 點心 SVG)
```

## 🙏 鳴謝 / Credits

- **DimSum / NonceGeek** —— 粵語語料、ASR 等公開能力。
- 視覺設計由 **open-design** 出稿,邏輯/工程與整合自建(分工見 `docs/INTEGRATION.md`)。

---

made with 🍵 for 廣府茶樓文化 · AI DimSum Hackathon #5
