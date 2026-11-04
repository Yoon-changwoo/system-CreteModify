import type { Metadata } from "next";
import ExpertWizard from "./ExpertWizard";

export const metadata: Metadata = {
  title: "시스템별 구축견적 산정 시스템 · IT 담당자용",
};

export default function ExpertPage() {
  return <ExpertWizard />;
}
