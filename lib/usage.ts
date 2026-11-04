/**
 * 견적 산출 사용량.
 * 지금은 로그인 없이 IP(해시)로 방문자를 구분하고,
 * 나중에 userId 필드를 채우면 계정 기준으로 바꿀 수 있다.
 */

import { createHash } from "crypto";

export type UsageChannel = "easy" | "cbo" | "expert" | "source";

export interface UsageEvent {
  id: string;
  at: string;
  channel: UsageChannel;
  stack: "java" | "sap";
  title: string;
  fp: number;
  /** 익명 방문자 키 (IP 해시). 로그인 도입 후 userId와 병행 */
  visitorKey: string;
  /** 표시용 마스킹 IP (예: 123.45.67.x) */
  ipHint: string;
  /** 로그인 도입 시 채움. 지금은 항상 null */
  userId: string | null;
}

export interface UsageStats {
  total: number;
  byChannel: Record<string, number>;
  byVisitor: { visitorKey: string; ipHint: string; count: number; lastAt: string }[];
  recent: UsageEvent[];
  durable: boolean;
  note: string;
}

export const CHANNEL_LABEL: Record<UsageChannel, string> = {
  easy: "신규·현업",
  cbo: "SAP CBO",
  expert: "신규·IT",
  source: "소스 분석",
};

export function maskIp(ip: string): string {
  const v4 = ip.split(".");
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.${v4[2]}.x`;
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 3).join(":")}:…`;
  }
  return ip ? `${ip.slice(0, 8)}…` : "unknown";
}

export function visitorKeyFromIp(ip: string): string {
  const salt = process.env.USAGE_SALT || "sw-cost-estimator-anon";
  return createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 16);
}

export function clientIpFromHeaders(headers: Headers): string {
  const xf = headers.get("x-forwarded-for") || headers.get("x-vercel-forwarded-for") || "";
  const first = xf.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown";
}

export function newEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
