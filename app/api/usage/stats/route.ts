import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/usageStore";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit") || 50)));
  const stats = await getUsageStats(limit);
  return NextResponse.json(stats);
}
