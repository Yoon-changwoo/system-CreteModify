import { NextResponse } from "next/server";
import { clientIpFromHeaders, maskIp, newEventId, visitorKeyFromIp, type UsageChannel } from "@/lib/usage";
import { appendUsage } from "@/lib/usageStore";

const CHANNELS: UsageChannel[] = ["easy", "cbo", "expert", "source"];

export async function POST(req: Request) {
  let body: {
    channel?: string;
    stack?: string;
    title?: string;
    fp?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 없습니다." }, { status: 400 });
  }

  const channel = body.channel as UsageChannel;
  if (!CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "channel 값이 올바르지 않습니다." }, { status: 400 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const stack = body.stack === "sap" ? "sap" : "java";
  const fp = typeof body.fp === "number" && Number.isFinite(body.fp) ? Math.max(0, Math.round(body.fp)) : 0;
  const title = (body.title || "").trim().slice(0, 120);

  await appendUsage({
    id: newEventId(),
    at: new Date().toISOString(),
    channel,
    stack,
    title,
    fp,
    visitorKey: visitorKeyFromIp(ip),
    ipHint: maskIp(ip),
    userId: null,
  });

  return NextResponse.json({ ok: true });
}
