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
