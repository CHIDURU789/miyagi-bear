import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "宮城県 クマ出没情報",
  description: "宮城県公式データに基づくツキノワグマ出没情報マップ（MVP）",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
