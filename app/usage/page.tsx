import type { Metadata } from "next";
import UsagePanel from "./UsagePanel";

export const metadata: Metadata = {
  title: "견적 사용량",
};

export const dynamic = "force-dynamic";

export default function UsagePage() {
  return <UsagePanel />;
}
