import type { Metadata } from "next";
import SourceWizard from "./SourceWizard";

export const metadata: Metadata = {
  title: "시스템별 구축견적 산정 시스템 · 소스 분석",
};

export default function SourcePage() {
  return <SourceWizard />;
}
