import type { Metadata } from "next";
import CboWizard from "./CboWizard";

export const metadata: Metadata = {
  title: "SAP CBO 추가개발 공수 산정",
};

export default function CboPage() {
  return <CboWizard />;
}
