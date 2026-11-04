/**
 * 사용량 저장.
 * - 로컬: data/usage.json (유지됨)
 * - Vercel: /tmp/usage.json (인스턴스 재시작 시 사라질 수 있음 → 로그인·DB 붙이면 교체)
 */

import { promises as fs } from "fs";
import path from "path";
import type { UsageEvent, UsageStats } from "./usage";
import { CHANNEL_LABEL } from "./usage";

const MAX_EVENTS = 5000;

type StoreFile = { events: UsageEvent[] };

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
    const parsed = JSON.parse(raw) as StoreFile;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return { events: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const trimmed = { events: store.events.slice(-MAX_EVENTS) };
  await fs.writeFile(file, JSON.stringify(trimmed, null, 2), "utf8");
}

export async function appendUsage(event: UsageEvent): Promise<void> {
  const store = await readStore();
  store.events.push(event);
  await writeStore(store);
}

export async function getUsageStats(limit = 50): Promise<UsageStats> {
  const { events } = await readStore();
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
    durable: isDurable(),
    note: isDurable()
      ? "로컬 파일에 사용량이 저장됩니다. 나중에 로그인·DB로 바꾸면 userId 기준으로 집계할 수 있습니다."
      : "Vercel 임시 저장(/tmp)이라 배포·재시작 후 수치가 초기질 수 있습니다. 테스트용이며, 로그인·DB 연동 시 영구 저장으로 바꿉니다.",
  };
}
