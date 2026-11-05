/**
 * 운영 중 Java + PostgreSQL 시스템 위에 기능을 얹는 추가개발 공수 입력 → 기능점수 변환.
 * SAP CBO와 같은 틀이며, 스택만 java로 고정한다.
 */

import { DEFAULT_INPUT, type EstimateInput, type FunctionCounts, type Level } from "./estimate";

export type AddonDomain = "crm" | "internal" | "integration" | "common";
export type AddonKind = "screen" | "api" | "report" | "interface" | "workflow" | "batch" | "schema";
export type AddonComplexity = "light" | "mid" | "heavy";
export type Coverage = 0.6 | 0.7 | 0.9 | 1;

export interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
}

export const DOMAIN_OPTIONS: (Option<AddonDomain> & { example: string })[] = [
  { value: "crm", label: "CRM·멤버십·채널", example: "캠페인, 포인트, 브랜드톡·알림", desc: "고객·회원·마케팅·메시지 계열" },
  { value: "internal", label: "내부 업무·포털", example: "품의·결재, 게시, 실적 조회", desc: "사내 업무 시스템·포털 확장" },
  { value: "integration", label: "외부 연계 허브", example: "ERP·WMS·PG·메시징 API", desc: "시스템 간 연동·중계" },
  { value: "common", label: "공통·교차", example: "권한, 코드, 다중 도메인", desc: "여러 영역에 걸친 공통 개발" },
];

export const KIND_OPTIONS: (Option<AddonKind> & { example: string; title: string; desc: string })[] = [
  {
    value: "screen",
    label: "화면·UI",
    example: "등록·수정 화면, 관리자 콘솔, 모바일 웹",
    title: "화면·UI 추가",
    desc: "기존 Java 화면에 등록·조회·관리 UI를 추가한다. 검증·이력·권한과 PostgreSQL 갱신이 포함된다.",
  },
  {
    value: "api",
    label: "REST·내부 API",
    example: "조회/명령 API 엔드포인트, BFF, 서비스 레이어",
    title: "REST·내부 API 추가",
    desc: "기존 테이블·서비스를 쓰는 조회·명령용 REST/내부 API를 추가한다. 새 테이블·외부 연계는 ‘DB 스키마’·‘외부 연계’를 따로 고른다.",
  },
  {
    value: "report",
    label: "조회·리포트",
    example: "목록 조회, 집계 대시보드, 엑셀 다운로드",
    title: "조회·리포트 추가",
    desc: "목록·집계 조회와 엑셀 다운로드를 추가한다. 집계 쿼리·인덱스·권한 필터가 필요하다.",
  },
  {
    value: "interface",
    label: "외부 시스템 연계",
    example: "ERP·PG·카카오·WMS 연동",
    title: "외부 시스템 연계 추가",
    desc: "외부 시스템과의 API·메시징 연동을 추가한다. 재시도·매핑·모니터링을 포함한다.",
  },
  {
    value: "workflow",
    label: "결재·워크플로",
    example: "다단계 승인, 반려·회수, 알림",
    title: "결재·워크플로 추가",
    desc: "다단계 결재·반려·회수·알림 워크플로를 추가한다.",
  },
  {
    value: "batch",
    label: "배치·스케줄",
    example: "야간 집계, 만료 처리, 재처리 큐",
    title: "배치·스케줄 추가",
    desc: "정기 배치·스케줄 잡과 실패 재처리를 추가한다.",
  },
  {
    value: "schema",
    label: "DB 스키마 포함 기능",
    example: "테이블·인덱스 추가와 함께 가는 기능",
    title: "DB 스키마 포함 기능 추가",
    desc: "PostgreSQL 테이블·인덱스 변경과 함께 API·화면을 추가한다. 마이그레이션·롤백을 포함한다.",
  },
];

/** 영역 + 유형으로 결과 화면 제목을 일관되게 만듦 */
export function buildAddonTitle(domain: AddonDomain | "", kinds: AddonKind[]): string {
  const d = domain ? DOMAIN_OPTIONS.find((x) => x.value === domain)?.label : "";
  const ks = kinds.map((k) => KIND_OPTIONS.find((x) => x.value === k)?.label).filter(Boolean);
  if (d && ks.length) return `${d} · ${ks.join(" · ")}`;
  if (d) return `${d} 추가개발`;
  if (ks.length) return ks.join(" · ");
  return "Java 추가개발";
}

export function buildAddonDescription(kinds: AddonKind[]): string {
  if (!kinds.length) return "";
  return kinds
    .map((id) => KIND_OPTIONS.find((x) => x.value === id)?.desc)
    .filter(Boolean)
    .join("\n\n");
}

export const COMPLEXITY_OPTIONS: Option<AddonComplexity>[] = [
  { value: "light", label: "단순", desc: "기존 테이블 조회·가벼운 로직, 화면·API 1~2개" },
  { value: "mid", label: "보통", desc: "검증·권한·엑셀·간단 갱신, 테스트 범위 보통" },
  { value: "heavy", label: "복잡", desc: "다단계 처리·대량 데이터·다중 연계·예외 경로 많음" },
];

export const COVERAGE_OPTIONS: Option<string>[] = [
  { value: "1", label: "보정 없음", desc: "적은 그대로 · 추가개발 기본값" },
  { value: "0.9", label: "거의 다 적음", desc: "전체의 약 90%" },
  { value: "0.7", label: "주요 기능 위주", desc: "전체의 약 70%" },
  { value: "0.6", label: "큰 그림만", desc: "전체의 약 60%" },
];

export interface AddonInput {
  title: string;
  description: string;
  domain: AddonDomain | "";
  /** 개발 유형 — 복수 선택 */
  kinds: AddonKind[];
  complexity: AddonComplexity;
  /** 이번 요청에 포함된 화면·API·잡 등 대략 개수 */
  objectCount: number;
  hasInterface: boolean;
  hasAuth: boolean;
  hasBatch: boolean;
  mobile: boolean;
  coverage: Coverage;
}

export const DEFAULT_ADDON: AddonInput = {
  title: "",
  description: "",
  domain: "",
  kinds: [],
  complexity: "mid",
  objectCount: 3,
  hasInterface: false,
  hasAuth: true,
  hasBatch: false,
  mobile: false,
  coverage: 1,
};

export const KIND_PRESETS: Record<AddonKind, Partial<AddonInput>> = {
  screen: { complexity: "mid", objectCount: 3, hasAuth: true },
  /** 단순 API 1개 제공이 기본 시나리오 — 과대 산정 방지 */
  api: { complexity: "light", objectCount: 1, hasAuth: false, hasInterface: false, hasBatch: false },
  report: { complexity: "mid", objectCount: 2, hasInterface: false, hasBatch: false },
  interface: { complexity: "heavy", objectCount: 4, hasInterface: true, hasBatch: true },
  workflow: { complexity: "heavy", objectCount: 3, hasAuth: true },
  batch: { complexity: "mid", objectCount: 2, hasBatch: true },
  schema: { complexity: "mid", objectCount: 2, hasAuth: true },
};

/**
 * 유형별 FP 시드. api는 ‘엔드포인트 단위’로 얇게 잡고,
 * 새 테이블·외부시스템은 schema / interface 유형·옵션으로만 올린다.
 * (구버전 api 시드 ILF1·EIF1·EI5…는 단순 API 1개에도 ~34FP·1.7M/M·~1,500만 원이 나와 과다했음)
 */
const KIND_BASE: Record<AddonKind, FunctionCounts> = {
  screen: { ilf: 2, eif: 1, ei: 5, eo: 1, eq: 3 },
  api: { ilf: 0, eif: 0, ei: 2, eo: 0, eq: 2 },
  report: { ilf: 1, eif: 2, ei: 1, eo: 3, eq: 3 },
  interface: { ilf: 2, eif: 3, ei: 4, eo: 3, eq: 2 },
  workflow: { ilf: 2, eif: 1, ei: 5, eo: 2, eq: 3 },
  batch: { ilf: 1, eif: 1, ei: 3, eo: 2, eq: 1 },
  schema: { ilf: 3, eif: 0, ei: 3, eo: 1, eq: 2 },
};

const CX: Record<AddonComplexity, { mul: number; perf: Level; prodCut: number }> = {
  light: { mul: 0.75, perf: 1, prodCut: 0 },
  mid: { mul: 1, perf: 2, prodCut: 1 },
  heavy: { mul: 1.45, perf: 3, prodCut: 2 },
};

const labelOf = <T extends string>(opts: Option<T>[], v: T) => opts.find((o) => o.value === v)?.label ?? v;

export interface AddonConversion {
  input: EstimateInput;
  counts: FunctionCounts;
  assumptions: string[];
}

function scale(n: number, mul: number) {
  return Math.max(0, Math.round(n * mul));
}

export function toEstimateInput(a: AddonInput): AddonConversion {
  const kinds = a.kinds.length > 0 ? a.kinds : (["screen"] as AddonKind[]);
  const base: FunctionCounts = { ilf: 0, eif: 0, ei: 0, eo: 0, eq: 0 };
  for (const k of kinds) {
    const b = KIND_BASE[k];
    base.ilf += b.ilf;
    base.eif += b.eif;
    base.ei += b.ei;
    base.eo += b.eo;
    base.eq += b.eq;
  }
  /** 유형이 여러 개면 합산 후 완만히 감쇠 (완전 합산은 과다) */
  const multiDamp = kinds.length <= 1 ? 1 : 0.55 + 0.45 / kinds.length;
  const cx = CX[a.complexity];
  const units = Math.max(1, Math.min(30, a.objectCount || 1));
  const unitMul = 0.55 + units * 0.22;
  const mul = cx.mul * unitMul * multiDamp;

  let counts: FunctionCounts = {
    ilf: scale(base.ilf, mul),
    eif: scale(base.eif, mul),
    ei: scale(base.ei, mul),
    eo: scale(base.eo, mul),
    eq: scale(base.eq, mul),
  };

  const hasKind = (k: AddonKind) => kinds.includes(k);
  if (a.hasInterface && !hasKind("interface")) {
    counts = { ...counts, eif: counts.eif + 2, ei: counts.ei + 2, eo: counts.eo + 2 };
  }
  if (a.hasAuth) counts = { ...counts, eq: counts.eq + 1, ei: counts.ei + 1 };
  if (a.hasBatch && !hasKind("batch")) counts = { ...counts, ei: counts.ei + 2, eo: counts.eo + 1, ilf: counts.ilf + 1 };
  if (hasKind("schema")) counts = { ...counts, ilf: counts.ilf + 1 };

  const assumptions: string[] = [];
  const domain = a.domain ? labelOf(DOMAIN_OPTIONS, a.domain) : "Java 시스템";
  const kindLabels = kinds.map((k) => labelOf(KIND_OPTIONS, k)).join(" · ");
  assumptions.push(
    `${domain} 기준 Java+Postgre 추가개발: ${kindLabels} × 약 ${units}개 · 복잡도 ${labelOf(COMPLEXITY_OPTIONS, a.complexity)}`,
  );
  assumptions.push(
    `기능점수 환산 ILF ${counts.ilf} / EIF ${counts.eif} / EI ${counts.ei} / EO ${counts.eo} / EQ ${counts.eq} (유형·오브젝트 수·복잡도로 보정)`,
  );
  if (a.hasInterface) assumptions.push("외부 시스템 연계(API·메시징·파일) 포함 → 매핑·모니터링·재처리 공수 반영");
  if (a.hasAuth) assumptions.push("권한·조직(브랜드·매장·부서) 체크 포함");
  if (a.hasBatch) assumptions.push("배치·스케줄 잡 또는 재처리 큐 포함");
  if (a.mobile) assumptions.push("모바일·현장 단말 사용 → UI·권한 테스트 비중 상향");
  assumptions.push(
    "기존 Java(Spring) + PostgreSQL 시스템 위에 얹는 개발로 산정합니다. 인프라 구축·상용 라이선스·보안 솔루션은 제외합니다.",
  );

  const productivity = Math.max(12, DEFAULT_INPUT.productivity - cx.prodCut);
  if (productivity < DEFAULT_INPUT.productivity) {
    assumptions.push(
      `추가개발은 영향 분석·회귀 테스트가 있어 생산성 가정을 ${DEFAULT_INPUT.productivity} → ${productivity} FP/M/M으로 둡니다`,
    );
  }
  if (a.coverage < 1) {
    assumptions.push(`입력 범위를 전체의 ${Math.round(a.coverage * 100)}%로 보고 ${(1 / a.coverage).toFixed(2)}배로 보정합니다.`);
  } else {
    assumptions.push("추가개발은 IT·개발 입력이라 커버리지 보정 없이(100%) 적은 범위 그대로 산정합니다.");
  }

  const input: EstimateInput = {
    ...DEFAULT_INPUT,
    title: a.title || buildAddonTitle(a.domain, kinds),
    description: a.description,
    mode: "detail",
    counts,
    externalLinks: a.hasInterface || hasKind("interface") ? Math.max(1, Math.round(units / 2)) : 0,
    perfLevel: cx.perf,
    envLevel: 2,
    secLevel: a.hasAuth ? 2 : 1,
    mobile: a.mobile,
    concurrentUsers: 120,
    dataGb: hasKind("batch") || a.complexity === "heavy" ? 300 : 80,
    productivity,
    inputCoverage: a.coverage,
    stack: "java",
  };

  return { input, counts, assumptions };
}
