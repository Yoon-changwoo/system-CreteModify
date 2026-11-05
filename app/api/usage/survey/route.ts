import { NextResponse } from "next/server";
import {
  clientIpFromHeaders,
  maskIp,
  newEventId,
  visitorKeyFromIp,
  type SurveyMilestone,
} from "@/lib/usage";
import { appendSurvey } from "@/lib/usageStore";

const MILESTONES: SurveyMilestone[] = [10, 50, 100];

export async function POST(req: Request) {
  let body: {
    milestone?: number;
    satisfaction?: number;
    satisfiedPoints?: unknown;
    dissatisfiedReasons?: unknown;
    neededFeatures?: unknown;
    recommend?: string;
    comment?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 없습니다." }, { status: 400 });
  }

  const milestone = body.milestone as SurveyMilestone;
  if (!MILESTONES.includes(milestone)) {
    return NextResponse.json({ error: "milestone 값이 올바르지 않습니다." }, { status: 400 });
  }

  const satisfaction = Number(body.satisfaction);
  if (![1, 2, 3, 4, 5].includes(satisfaction)) {
    return NextResponse.json({ error: "만족도를 1~5점으로 선택해 주세요." }, { status: 400 });
  }

  const recommend = body.recommend;
  if (recommend !== "yes" && recommend !== "no" && recommend !== "maybe") {
    return NextResponse.json({ error: "추천 의향을 선택해 주세요." }, { status: 400 });
  }

  const asList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean).slice(0, 20) : [];

  const ip = clientIpFromHeaders(req.headers);
  const result = await appendSurvey({
    id: newEventId(),
    at: new Date().toISOString(),
    milestone,
    visitorKey: visitorKeyFromIp(ip),
    ipHint: maskIp(ip),
    satisfaction,
    satisfiedPoints: asList(body.satisfiedPoints),
    dissatisfiedReasons: asList(body.dissatisfiedReasons),
    neededFeatures: asList(body.neededFeatures),
    recommend,
    comment: typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "",
    userId: null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
