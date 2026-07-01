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
  // 只用 origin;Next 会自动给静态图片资源加上 basePath(/SavorTea),
  // 若这里再带 /SavorTea 会重复成 /SavorTea/SavorTea/…。
  metadataBase: new URL("https://starrydeserts.github.io"),
  title: "叹茶 · 虚拟茶楼 — SavorTea",
  description:
    "在虚拟茶楼里用粤语点心 —— 点心姨看你点得多地道,集齐十道印章。BYOK、纯静态、无后端。",
  openGraph: {
    title: "叹茶 · 虚拟茶楼 — SavorTea",
    description: "用粤语点心的虚拟茶楼小游戏。",
    type: "website",
    siteName: "叹茶 · 虚拟茶楼",
  },
  twitter: { card: "summary_large_image" },
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
