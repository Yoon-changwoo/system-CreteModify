/**
 * 기존 SAP 시스템 위에 업무를 추가하는 CBO(추가개발) 공수 입력 → 기능점수 변환.
 * 신규 구축과 달리 “화면·리포트·연계·Enhancement 몇 개”를 세고, 스택은 SAP ABAP로 고정한다.
 */

import { DEFAULT_INPUT, type EstimateInput, type FunctionCounts, type Level } from "./estimate";

export type CboModule = "erp" | "scm" | "fcm" | "cross";
export type CboKind = "report" | "dialog" | "interface" | "enhancement" | "workflow" | "form" | "batch";
export type CboComplexity = "light" | "mid" | "heavy";
export type Coverage = 0.6 | 0.7 | 0.9 | 1;

export interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
}

export const MODULE_OPTIONS: (Option<CboModule> & { example: string })[] = [
  { value: "erp", label: "SAP ERP", example: "MM·SD·PP·FI/CO 표준 업무 확장", desc: "구매·판매·생산·회계 표준 프로세스에 화면·로직 추가" },
  { value: "scm", label: "SCM(공급망)", example: "물류·창고·납기·수송 연계", desc: "재고·출하·입고·창고 이동 등 공급망 업무" },
  { value: "fcm", label: "FCM(재무·자금)", example: "자금·원가·결산·전표 보조", desc: "재무·자금·원가·결산 보조 프로그램" },
  { value: "cross", label: "공통·교차", example: "마스터·권한·배치·다중 모듈", desc: "여러 모듈에 걸친 공통 개발" },
];

export const KIND_OPTIONS: (Option<CboKind> & { example: string; title: string; desc: string })[] = [
  {
    value: "report",
    label: "조회·ALV 리포트",
    example: "재고현황 ALV, 미결 오더 조회, 원가 집계표",
    title: "재고·미결 현황 ALV 리포트",
    desc: "SCM 창고·공장 재고와 미결 출고 오더를 ALV로 조회하고, 플랜트·저장위치·자재 그룹으로 필터한 뒤 엑셀로 내려받는다. ERP 자재·재고 테이블을 읽고, 권한은 플랜트 단위로 막는다.",
  },
  {
    value: "dialog",
    label: "입력·처리 화면",
    example: "커스텀 등록 화면, 일괄 수정, 현장 입력",
    title: "현장 입출고 보조 입력 화면",
    desc: "창고 담당자가 스캔·수량으로 입출고를 등록하면 SAP 재고 이동을 호출한다. 검증·오류 메시지·임시저장이 필요하고, 모바일 브라우저에서도 쓸 수 있으면 좋다.",
  },
  {
    value: "interface",
    label: "외부 연계(IDoc·RFC·API)",
    example: "WMS 연계, 은행 전문, MES RFC",
    title: "WMS↔SAP 입출고 연계",
    desc: "물류창고 WMS와 SAP SCM 사이에 입고·출고·재고조정 IDoc/RFC를 주고받는다. 실패 재처리, 매핑 테이블, 모니터링 화면이 포함된다.",
  },
  {
    value: "enhancement",
    label: "Enhancement·BADI·Exit",
    example: "표준 저장 전 검증, 전표 항목 추가, 단가 로직",
    title: "구매오더 저장 시 사내 단가 검증 BADI",
    desc: "ERP MM 구매오더 저장 직전에 사내 단가·계약 조건을 검사하는 BADI를 넣는다. 조건 테이블과 메시지, 예외 승인 플래그가 필요하다.",
  },
  {
    value: "workflow",
    label: "결재·워크플로",
    example: "전표 승인, 발주 결재, 예외 승인",
    title: "고액 발주 다단계 결재 워크플로",
    desc: "일정 금액 이상 발주 시 팀장→본부장 결재 후 전기한다. 반려·회수, 대리결재, 메신저 알림을 포함한다.",
  },
  {
    value: "form",
    label: "출력 폼(Smartforms 등)",
    example: "거래명세서, 납품서, 세금계산 보조",
    title: "납품서·거래명세 Smartforms",
    desc: "출하 확정 후 납품서·거래명세를 Smartforms로 출력하고 PDF 저장·메일 첨부한다. 플랜트별 양식 분기가 있다.",
  },
  {
    value: "batch",
    label: "배치·정기 잡",
    example: "야간 집계, 마감 보조, 인터페이스 재처리",
    title: "일마감 재고·원가 집계 배치",
    desc: "매일 야간에 플랜트별 재고·이동평균·미결을 집계해 FCM 원가 보조 테이블에 적재하고, 실패 건은 재처리 큐에 넣는다.",
  },
];

export const COMPLEXITY_OPTIONS: Option<CboComplexity>[] = [
  { value: "light", label: "단순", desc: "표준 테이블 조회·가벼운 로직, 화면 1~2개" },
  { value: "mid", label: "보통", desc: "검증·권한·엑셀·간단 갱신, 테스트 범위 보통" },
  { value: "heavy", label: "복잡", desc: "다단계 처리·대량 데이터·다중 연계·예외 경로 많음" },
];

export const COVERAGE_OPTIONS: Option<string>[] = [
  { value: "1", label: "보정 없음", desc: "적은 그대로 · CBO 기본값" },
  { value: "0.9", label: "거의 다 적음", desc: "전체의 약 90%" },
  { value: "0.7", label: "주요 기능 위주", desc: "전체의 약 70%" },
  { value: "0.6", label: "큰 그림만", desc: "전체의 약 60%" },
];

export interface CboInput {
  title: string;
  description: string;
  module: CboModule | "";
  /** CBO 유형 — 복수 선택 */
  kinds: CboKind[];
  complexity: CboComplexity;
  /** 이번 요청에 포함된 CBO·오브젝트 대략 개수 */
  objectCount: number;
  hasInterface: boolean;
  hasAuth: boolean;
  hasBatch: boolean;
  mobile: boolean;
  coverage: Coverage;
}

export const DEFAULT_CBO: CboInput = {
  title: "",
  description: "",
  module: "",
  kinds: [],
  complexity: "mid",
  objectCount: 3,
  hasInterface: false,
  hasAuth: true,
  hasBatch: false,
  mobile: false,
  /** CBO는 IT·개발이 입력하므로 현업용 60% 보정을 쓰지 않음 */
  coverage: 1,
};

export const KIND_PRESETS: Record<CboKind, Partial<CboInput>> = {
  report: { complexity: "mid", objectCount: 2, hasInterface: false, hasBatch: false },
  dialog: { complexity: "mid", objectCount: 3, hasAuth: true },
  interface: { complexity: "heavy", objectCount: 4, hasInterface: true, hasBatch: true },
  enhancement: { complexity: "mid", objectCount: 2, hasAuth: true },
  workflow: { complexity: "heavy", objectCount: 3, hasAuth: true },
  form: { complexity: "light", objectCount: 2 },
  batch: { complexity: "mid", objectCount: 2, hasBatch: true },
};

const KIND_BASE: Record<CboKind, FunctionCounts> = {
  report: { ilf: 1, eif: 2, ei: 1, eo: 3, eq: 3 },
  dialog: { ilf: 2, eif: 1, ei: 5, eo: 1, eq: 3 },
  interface: { ilf: 2, eif: 3, ei: 4, eo: 3, eq: 2 },
  enhancement: { ilf: 1, eif: 1, ei: 4, eo: 1, eq: 2 },
  workflow: { ilf: 2, eif: 1, ei: 5, eo: 2, eq: 3 },
  form: { ilf: 0, eif: 1, ei: 1, eo: 3, eq: 1 },
  batch: { ilf: 1, eif: 1, ei: 3, eo: 2, eq: 1 },
};

const CX: Record<CboComplexity, { mul: number; perf: Level; prodCut: number }> = {
  light: { mul: 0.75, perf: 1, prodCut: 0 },
  mid: { mul: 1, perf: 2, prodCut: 1 },
  heavy: { mul: 1.45, perf: 3, prodCut: 3 },
};

const labelOf = <T extends string>(opts: Option<T>[], v: T) => opts.find((o) => o.value === v)?.label ?? v;

export interface CboConversion {
  input: EstimateInput;
  counts: FunctionCounts;
  assumptions: string[];
}

function scale(n: number, mul: number) {
  return Math.max(0, Math.round(n * mul));
}

export function toEstimateInput(c: CboInput): CboConversion {
  const kinds = c.kinds.length > 0 ? c.kinds : (["report"] as CboKind[]);
  const base: FunctionCounts = { ilf: 0, eif: 0, ei: 0, eo: 0, eq: 0 };
  for (const k of kinds) {
    const b = KIND_BASE[k];
    base.ilf += b.ilf;
    base.eif += b.eif;
    base.ei += b.ei;
    base.eo += b.eo;
    base.eq += b.eq;
  }
  const multiDamp = kinds.length <= 1 ? 1 : 0.55 + 0.45 / kinds.length;
  const cx = CX[c.complexity];
  const units = Math.max(1, Math.min(30, c.objectCount || 1));
  /** 오브젝트 1개를 기준 단위로 보고, 개수에 따라 완만히 증가 */
  const unitMul = 0.55 + units * 0.22;
  const mul = cx.mul * unitMul * multiDamp;

  let counts: FunctionCounts = {
    ilf: scale(base.ilf, mul),
    eif: scale(base.eif, mul),
    ei: scale(base.ei, mul),
    eo: scale(base.eo, mul),
    eq: scale(base.eq, mul),
  };

  const hasKind = (k: CboKind) => kinds.includes(k);
  if (c.hasInterface && !hasKind("interface")) {
    counts = { ...counts, eif: counts.eif + 2, ei: counts.ei + 2, eo: counts.eo + 2 };
  }
  if (c.hasAuth) counts = { ...counts, eq: counts.eq + 1, ei: counts.ei + 1 };
  if (c.hasBatch && !hasKind("batch")) counts = { ...counts, ei: counts.ei + 2, eo: counts.eo + 1, ilf: counts.ilf + 1 };

  const assumptions: string[] = [];
  const mod = c.module ? labelOf(MODULE_OPTIONS, c.module) : "SAP";
  const kindLabels = kinds.map((k) => labelOf(KIND_OPTIONS, k)).join(" · ");
  assumptions.push(`${mod} 기준 CBO·추가개발: ${kindLabels} × 약 ${units}개 · 복잡도 ${labelOf(COMPLEXITY_OPTIONS, c.complexity)}`);
  assumptions.push(
    `기능점수 환산 ILF ${counts.ilf} / EIF ${counts.eif} / EI ${counts.ei} / EO ${counts.eo} / EQ ${counts.eq} (유형·오브젝트 수·복잡도로 보정)`,
  );
  if (c.hasInterface) assumptions.push("외부 시스템 연계(IDoc·RFC·API) 포함 → 매핑·모니터링·재처리 공수 반영");
  if (c.hasAuth) assumptions.push("권한·조직(플랜트·회사코드) 체크 포함");
  if (c.hasBatch) assumptions.push("배치·정기 잡 또는 재처리 큐 포함");
  if (c.mobile) assumptions.push("모바일·현장 단말 사용 → UI·권한 테스트 비중 상향");
  assumptions.push("기존 SAP 표준·커스텀 위에 얹는 개발로 보고, 구현 스택은 SAP ABAP + HANA로 산정합니다. 라이선스·BASIS·인프라 구축비는 제외합니다.");

  const productivity = Math.max(10, DEFAULT_INPUT.productivity - 6 - cx.prodCut);
  if (productivity < DEFAULT_INPUT.productivity) {
    assumptions.push(`SAP CBO는 전송·테스트·표준 영향 분석이 커서 생산성 가정을 ${DEFAULT_INPUT.productivity} → ${productivity} FP/M/M으로 둡니다`);
  }
  if (c.coverage < 1) {
    assumptions.push(`입력 범위를 전체의 ${Math.round(c.coverage * 100)}%로 보고 ${(1 / c.coverage).toFixed(2)}배로 보정합니다.`);
  } else {
    assumptions.push("CBO는 IT·개발 입력이라 커버리지 보정 없이(100%) 적은 범위 그대로 산정합니다.");
  }

  const input: EstimateInput = {
    ...DEFAULT_INPUT,
    title: c.title || `${mod} CBO 추가개발`,
    description: c.description,
    mode: "detail",
    counts,
    externalLinks: c.hasInterface || hasKind("interface") ? Math.max(1, Math.round(units / 2)) : 0,
    perfLevel: cx.perf,
    envLevel: 2,
    secLevel: c.hasAuth ? 2 : 1,
    mobile: c.mobile,
    concurrentUsers: 80,
    dataGb: hasKind("batch") || c.complexity === "heavy" ? 200 : 50,
    productivity,
    inputCoverage: c.coverage,
    stack: "sap",
  };

  return { input, counts, assumptions };
}
