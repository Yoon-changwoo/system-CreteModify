import type { Metadata } from "next";
import AddonWizard from "./AddonWizard";

export const metadata: Metadata = {
  title: "Java+Postgre 추가개발 공수 산정",
};

export default function AddonPage() {
  return <AddonWizard />;
}
