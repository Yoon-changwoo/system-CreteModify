/**
 * 사용량·설문 저장.
 * - 로컬: data/usage.json (유지됨)
 * - Vercel: /tmp/usage.json (인스턴스 재시작 시 사라질 수 있음 → 로그인·DB 붙이면 교체)
 */

import { promises as fs } from "fs";
import path from "path";
import type { SurveyMilestone, SurveyResponse, UsageEvent, UsageStats } from "./usage";
import { CHANNEL_LABEL, pendingSurveyMilestone } from "./usage";

const MAX_EVENTS = 5000;
const MAX_SURVEYS = 2000;

type StoreFile = { events: UsageEvent[]; surveys: SurveyResponse[] };

function storePath(): string {
  if (process.env.USAGE_DATA_PATH) return process.env.USAGE_DATA_PATH;
  if (process.env.VERCEL) return path.join("/tmp", "sw-cost-usage.json");
  return path.join(process.cwd(), "data", "usage.json");
}

function isDurable(): boolean {
  return !process.env.VERCEL || !!process.env.USAGE_DATA_PATH;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
      surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
    };
  } catch {
    return { events: [], surveys: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const trimmed: StoreFile = {
    events: store.events.slice(-MAX_EVENTS),
    surveys: store.surveys.slice(-MAX_SURVEYS),
  };
  await fs.writeFile(file, JSON.stringify(trimmed, null, 2), "utf8");
}

export async function appendUsage(event: UsageEvent): Promise<{
  count: number;
  pendingSurvey: SurveyMilestone | null;
}> {
  const store = await readStore();
  store.events.push(event);
  await writeStore(store);

  const count = store.events.filter((e) => e.visitorKey === event.visitorKey).length;
  const done = store.surveys.filter((s) => s.visitorKey === event.visitorKey).map((s) => s.milestone);
  return { count, pendingSurvey: pendingSurveyMilestone(count, done) };
}

export async function appendSurvey(survey: SurveyResponse): Promise<{ ok: true } | { error: string }> {
  const store = await readStore();
  const dup = store.surveys.some((s) => s.visitorKey === survey.visitorKey && s.milestone === survey.milestone);
  if (dup) return { error: "이미 제출한 설문입니다." };
  store.surveys.push(survey);
  await writeStore(store);
  return { ok: true };
}

export async function getUsageStats(limit = 50): Promise<UsageStats> {
  const { events, surveys } = await readStore();
  const byChannel: Record<string, number> = {};
  const visitorMap = new Map<string, { visitorKey: string; ipHint: string; count: number; lastAt: string }>();

  for (const e of events) {
    const ch = CHANNEL_LABEL[e.channel] || e.channel;
    byChannel[ch] = (byChannel[ch] || 0) + 1;
    const prev = visitorMap.get(e.visitorKey);
    if (!prev) {
      visitorMap.set(e.visitorKey, { visitorKey: e.visitorKey, ipHint: e.ipHint, count: 1, lastAt: e.at });
    } else {
      prev.count += 1;
      if (e.at > prev.lastAt) {
        prev.lastAt = e.at;
        prev.ipHint = e.ipHint;
      }
    }
  }

  const byVisitor = [...visitorMap.values()].sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
  const recent = [...events].reverse().slice(0, limit);

  return {
    total: events.length,
    byChannel,
    byVisitor,
    recent,
    surveys: [...surveys].reverse().slice(0, 100),
    durable: isDurable(),
    note: isDurable()
      ? "로컬 파일에 사용량·설문이 저장됩니다. 나중에 로그인·DB로 바꾸면 userId 기준으로 집계할 수 있습니다."
      : "Vercel 임시 저장(/tmp)이라 배포·재시작 후 수치가 초기질 수 있습니다. 테스트용이며, 로그인·DB 연동 시 영구 저장으로 바꿉니다.",
  };
}
