/**
 * 견적 산출 사용량.
 * 지금은 로그인 없이 IP(해시)로 방문자를 구분하고,
 * 나중에 userId 필드를 채우면 계정 기준으로 바꿀 수 있다.
 */

import { createHash } from "crypto";

export type UsageChannel = "easy" | "cbo" | "addon" | "expert" | "source";

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

export type SurveyMilestone = 10 | 50 | 100;

export const SURVEY_MILESTONES: SurveyMilestone[] = [10, 50, 100];

export interface SurveyResponse {
  id: string;
  at: string;
  milestone: SurveyMilestone;
  visitorKey: string;
  ipHint: string;
  /** 1(매우 불만족) ~ 5(매우 만족) */
  satisfaction: number;
  satisfiedPoints: string[];
  dissatisfiedReasons: string[];
  neededFeatures: string[];
  recommend: "yes" | "no" | "maybe";
  comment: string;
  userId: string | null;
}

export interface UsageStats {
  total: number;
  byChannel: Record<string, number>;
  byVisitor: { visitorKey: string; ipHint: string; count: number; lastAt: string }[];
  recent: UsageEvent[];
  surveys: SurveyResponse[];
  durable: boolean;
  note: string;
}

export const SATISFIED_OPTIONS = [
  "산정 결과가 이해하기 쉽다",
  "입력 방식이 간단하다",
  "공공 표준·시세 비교가 유용하다",
  "SAP ERP/SCM/FCM·CBO 예시가 우리 업무와 맞다",
  "화면·문구가 현업/IT 모두 쓰기 좋다",
  "공수·금액 근거가 설득력 있다",
];

export const DISSATISFIED_OPTIONS = [
  "입력 항목이 많거나 어렵다",
  "산정 금액·공수가 체감과 다르다",
  "우리 회사 업무 유형이 부족하다",
  "결과 설명이 부족하다",
  "속도·오류 등 사용성이 불편하다",
  "보안(파일 업로드 등) 때문에 쓰기 어렵다",
];

export const NEEDED_FEATURE_OPTIONS = [
  "로그인·개인별 견적 이력",
  "견적 저장·공유·PDF 내보내기",
  "부서/프로젝트별 집계 대시보드",
  "더 많은 SAP·CRM 템플릿",
  "엑셀 업로드로 일괄 산정",
  "관리자 승인·버전 관리",
];

/** 정확히 10·50·100건에 도달한 순간에만, 아직 제출하지 않은 마일스톤 */
export function pendingSurveyMilestone(count: number, done: SurveyMilestone[]): SurveyMilestone | null {
  for (const m of SURVEY_MILESTONES) {
    if (count === m && !done.includes(m)) return m;
  }
  return null;
}

export const CHANNEL_LABEL: Record<UsageChannel, string> = {
  easy: "신규·현업",
  cbo: "SAP CBO",
  addon: "Java 추가",
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
