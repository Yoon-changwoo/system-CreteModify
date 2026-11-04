import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "시스템별 구축견적 산정 시스템",
  description: "SAP ERP·SCM·FCM 신규 구축과 CBO 추가개발 공수를 국내 공공 표준과 시장 시세로 비교 산정합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
