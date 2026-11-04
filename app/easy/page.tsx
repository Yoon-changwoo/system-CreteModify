import type { Metadata } from "next";
import EasyWizard from "./EasyWizard";

export const metadata: Metadata = {
  title: "신규 시스템 구축 공수 · 현업 입력",
};

export default function EasyPage() {
  return <EasyWizard />;
}
