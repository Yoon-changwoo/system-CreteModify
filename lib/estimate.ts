/**
 * 한국 SW 개발비 산정 로직 (Java + PostgreSQL 웹 시스템 기준)
 *
 * 산정 근거
 *  1) 공공 표준: 「SW사업 대가산정 가이드」(한국인공지능·소프트웨어산업협회, KOSA) 기능점수(FP) 간이법
 *     - FP당 단가 605,784원 (2024년 개정판에서 인상, 2025년 개정판·2026년 양식에서 동일 적용)
 *     - 평균복잡도 가중치: ILF 7.5 / EIF 5.4 / EI 4.0 / EO 5.2 / EQ 3.9
 *     - 보정계수: 규모, 연계복잡성, 성능, 운영환경 호환성, 보안성
 *     - SW개발비 = 개발원가 + 직접경비 + 이윤(개발원가의 25% 이내)
 *  2) 인건비 공식 통계: 2026년 적용 SW기술자 평균임금 (KOSA, 2025-12-19 공표, 통계승인 제375001호)
 *  3) 민간 시세: 2026년 국내 SI/외주 등급별 월 단가 범위 (IT노조 단가 공유, 위시켓 계약 데이터 등 종합 참고치)
 *
 * 보안 구축비·인프라비는 개발 공수에서 제외한다. 보안성 보정계수는 가이드 산식의 일부이므로 유지하되 기본값을 최저(1단계)로 둔다.
 */

export const RATE_YEAR = 2026;

/** FP당 단가(원). 제경비·기술료 포함, 부가세 별도. */
export const FP_UNIT_PRICE = 605_784;

/** 간이법 평균복잡도 가중치 */
export const FP_WEIGHTS = { ILF: 7.5, EIF: 5.4, EI: 4.0, EO: 5.2, EQ: 3.9 } as const;

/** 2026년 적용 SW기술자 평균임금 (월평균, 원) */
export const KOSA_WAGE = {
  pm: { label: "IT PM", monthly: 10_086_804 },
  architect: { label: "IT아키텍트", monthly: 11_103_230 },
  analyst: { label: "업무분석가", monthly: 9_740_667 },
  appDev: { label: "응용SW개발자", monthly: 7_754_124 },
  uiux: { label: "UI/UX 기획/개발자", monthly: 6_901_660 },
  tester: { label: "IT테스터", monthly: 4_053_137 },
  qa: { label: "IT품질관리자", monthly: 11_042_071 },
} as const;
export type KosaRole = keyof typeof KOSA_WAGE;

/** 민간 SI 등급별 월 단가 범위(원). 1차 수행사 기준 기술자 수령액 시세. */
export const MARKET_GRADE = {
  초급: { low: 4_500_000, high: 5_500_000 },
  중급: { low: 6_000_000, high: 7_500_000 },
  고급: { low: 8_500_000, high: 10_000_000 },
  특급: { low: 11_000_000, high: 14_000_000 },
} as const;
export type Grade = keyof typeof MARKET_GRADE;

/** 결과 화면에서 전환하는 구현 스택. 기본은 Java. */
export type Stack = "java" | "sap";

export const JAVA_PRODUCTIVITY = 20;
/** SAP ABAP는 화면·인터페이스·전송 작업이 많아 Java보다 생산성을 낮게 잡는다 (12~14 구간의 중간). */
export const SAP_PRODUCTIVITY = 13;

/** 국내 SAP 컨설턴트 등급 월 단가 참고치(원). 공식 통계가 아님. */
export const MARKET_GRADE_SAP: Record<Grade, { low: number; high: number }> = {
  초급: { low: 5_500_000, high: 7_000_000 },
  중급: { low: 7_000_000, high: 8_500_000 },
  고급: { low: 10_000_000, high: 13_000_000 },
  특급: { low: 14_000_000, high: 18_000_000 },
};

export function marketGradesOf(stack: Stack) {
  return stack === "sap" ? MARKET_GRADE_SAP : MARKET_GRADE;
}

/** Java 입력 생산성을 SAP 비율로 환산. 집계 등으로 이미 낮춘 값도 같은 비율로 내린다. */
export function productivityOf(input: EstimateInput): number {
  const base = Math.max(1, input.productivity);
  if ((input.stack ?? "java") === "sap") {
    return Math.max(8, Math.round((base * SAP_PRODUCTIVITY) / JAVA_PRODUCTIVITY));
  }
  return base;
}

/** 보정계수 표 (1~5단계) */
export const PERF_FACTORS = [0.91, 0.95, 1.0, 1.05, 1.09] as const;
export const ENV_FACTORS = [0.94, 1.0, 1.06, 1.13, 1.19] as const;
export const SEC_FACTORS = [0.97, 1.0, 1.03, 1.06, 1.08] as const;

export const PERF_LABELS = [
  "응답성능 요구 없음",
  "요구는 있으나 특별 조치 불필요",
  "피크타임 응답시간·처리 시한 명시",
  "모든 업무시간 응답시간 중요",
  "성능 분석도구 사용이 필요할 만큼 엄격",
];
export const ENV_LABELS = [
  "운영환경 호환성 요구 없음",
  "동일한 HW/SW 환경에서 운영",
  "유사한 HW/SW 환경에서 운영",
  "이질적인 HW/SW 환경에서 운영",
  "4단계 + 운영절차 문서화·모의훈련 요구",
];
export const SEC_LABELS = [
  "암호화·웹취약점·시큐어코딩·개인정보보호 중 1가지",
  "위 4가지 중 2가지",
  "위 4가지 중 3가지",
  "4가지 모두 포함",
  "4가지 + 추가 보안 요구",
];

export type Level = 1 | 2 | 3 | 4 | 5;

export interface FunctionCounts {
  ilf: number; // 내부논리파일: 이 시스템이 직접 관리하는 데이터 종류
  eif: number; // 외부연계파일: 다른 시스템 데이터를 참조만 하는 종류
  ei: number; // 외부입력: 등록/수정/삭제/승인 등 데이터를 바꾸는 기능
  eo: number; // 외부출력: 계산·집계가 들어간 리포트/통계/알림
  eq: number; // 외부조회: 단순 조회/검색/상세보기
}

export interface EstimateInput {
  title: string;
  description: string;
  mode: "simple" | "detail";
  /** 간편 모드 입력 */
  screens: number;
  entities: number;
  /** 상세 모드 입력 */
  counts: FunctionCounts;
  /** 환경·요구 */
  externalLinks: number;
  perfLevel: Level;
  envLevel: Level;
  secLevel: Level;
  mobile: boolean;
  concurrentUsers: number;
  dataGb: number;
  /** 산정 파라미터 */
  profitRate: number; // 0 ~ 0.25
  productivity: number; // FP / M/M
  vendorOverhead: number; // 민간 수행사 관리비·이윤 비율
  affiliateQuote: number; // 이노플 제안가격(원, VAT 별도). 0이면 미입력 · 결과 화면에서 민간 SI 시세 75%로 기본 채움
  /**
   * 입력된 기능이 전체 대비 몇 %인가.
   * 현업 기본은 큰 그림 0.6, 주요 기능 위주는 0.7. 1이면 보정 없음.
   */
  inputCoverage: number;
  /** java(기본) | sap. 공공 FP 단가는 공통, 공수·시장가만 달라진다. */
  stack: Stack;
}

export const DEFAULT_INPUT: EstimateInput = {
  title: "",
  description: "",
  mode: "simple",
  screens: 12,
  entities: 6,
  counts: { ilf: 6, eif: 2, ei: 12, eo: 5, eq: 10 },
  externalLinks: 1,
  perfLevel: 1,
  envLevel: 2,
  secLevel: 1,
  mobile: false,
  concurrentUsers: 100,
  dataGb: 20,
  profitRate: 0.1,
  productivity: 20,
  vendorOverhead: 0.2,
  affiliateQuote: 0,
  inputCoverage: 1,
  stack: "java",
};

/** 입력 커버리지로 기능 개수를 전체 규모로 환산한다. 0.6이면 약 1.67배. */
export function scaleCounts(c: FunctionCounts, coverage: number): FunctionCounts {
  const cap = Math.min(1, Math.max(0.4, coverage || 1));
  if (cap >= 0.999) return { ...c };
  const k = 1 / cap;
  const s = (n: number) => Math.max(n, Math.round(n * k));
  return { ilf: s(c.ilf), eif: s(c.eif), ei: s(c.ei), eo: s(c.eo), eq: s(c.eq) };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  counts: FunctionCounts;
  externalLinks: number;
  concurrentUsers: number;
  dataGb: number;
}

export const TEMPLATES: Template[] = [
  {
    id: "erp",
    name: "SAP ERP 구매·판매·회계",
    description: "구매요청~입고·송장, 판매~출하·매출, FI/CO 전표·원가센터를 아우르는 ERP 구축",
    counts: { ilf: 18, eif: 8, ei: 40, eo: 18, eq: 28 },
    externalLinks: 5,
    concurrentUsers: 800,
    dataGb: 500,
  },
  {
    id: "scm",
    name: "SCM 물류·창고·납기",
    description: "재고·출하·수송·납기 관리와 WMS·MES 연계가 있는 공급망 시스템",
    counts: { ilf: 14, eif: 7, ei: 32, eo: 16, eq: 22 },
    externalLinks: 4,
    concurrentUsers: 400,
    dataGb: 300,
  },
  {
    id: "fcm",
    name: "FCM 자금·원가·결산",
    description: "자금시재, 원가 집계, 결산 보조, 예산·전표 연계 재무 시스템",
    counts: { ilf: 12, eif: 6, ei: 26, eo: 14, eq: 18 },
    externalLinks: 4,
    concurrentUsers: 200,
    dataGb: 150,
  },
  {
    id: "approval",
    name: "구매요청·품의 결재",
    description: "금액 구간별 다단계 결재 후 ERP 발주·예산 반영",
    counts: { ilf: 10, eif: 4, ei: 22, eo: 10, eq: 16 },
    externalLinks: 3,
    concurrentUsers: 500,
    dataGb: 80,
  },
  {
    id: "dashboard",
    name: "ERP·SCM·FCM 실적 대시보드",
    description: "전사 KPI·재고·자금·원가를 모아 보여주는 경영 현황판",
    counts: { ilf: 4, eif: 8, ei: 8, eo: 18, eq: 12 },
    externalLinks: 5,
    concurrentUsers: 300,
    dataGb: 400,
  },
  {
    id: "cbo-pack",
    name: "SAP CBO 묶음(리포트·연계)",
    description: "기존 SAP 위 ALV·다이얼로그·IDoc 연계 등 추가개발 묶음",
    counts: { ilf: 6, eif: 5, ei: 16, eo: 12, eq: 10 },
    externalLinks: 3,
    concurrentUsers: 100,
    dataGb: 80,
  },
  {
    id: "campaign",
    name: "캠페인·타겟팅",
    description: "고객·매출 집계, 조건 추출, 카카오·Push 발송, 성과 분석",
    counts: { ilf: 12, eif: 6, ei: 28, eo: 18, eq: 16 },
    externalLinks: 5,
    concurrentUsers: 200,
    dataGb: 4000,
  },
  {
    id: "membership",
    name: "브랜드·통합 멤버십",
    description: "회원·등급·포인트·쿠폰과 POS·몰 연계",
    counts: { ilf: 14, eif: 5, ei: 30, eo: 12, eq: 18 },
    externalLinks: 4,
    concurrentUsers: 300,
    dataGb: 800,
  },
  {
    id: "channel",
    name: "채널서버(브랜드톡 발송)",
    description: "카카오 브랜드톡·알림톡·SMS·Push 중계·모니터링",
    counts: { ilf: 6, eif: 3, ei: 18, eo: 14, eq: 10 },
    externalLinks: 4,
    concurrentUsers: 50,
    dataGb: 500,
  },
];

/* ------------------------------------------------------------------ */
/* 기능점수                                                             */
/* ------------------------------------------------------------------ */

/** 간편 모드: 화면 수·데이터 종류 수로 기능 개수를 추정한다. */
export function deriveCounts(input: EstimateInput): FunctionCounts {
  if (input.mode === "detail") return input.counts;
  const s = Math.max(0, input.screens);
  const e = Math.max(0, input.entities);
  return {
    ilf: e,
    eif: Math.round(e * 0.3),
    ei: Math.round(s * 1.0),
    eo: Math.round(s * 0.4),
    eq: Math.round(s * 0.8),
  };
}

export function calcFunctionPoints(c: FunctionCounts) {
  const rows = [
    { key: "ilf", label: "내부논리파일(ILF)", count: c.ilf, weight: FP_WEIGHTS.ILF },
    { key: "eif", label: "외부연계파일(EIF)", count: c.eif, weight: FP_WEIGHTS.EIF },
    { key: "ei", label: "외부입력(EI)", count: c.ei, weight: FP_WEIGHTS.EI },
    { key: "eo", label: "외부출력(EO)", count: c.eo, weight: FP_WEIGHTS.EO },
    { key: "eq", label: "외부조회(EQ)", count: c.eq, weight: FP_WEIGHTS.EQ },
  ].map((r) => ({ ...r, fp: r.count * r.weight }));
  const total = rows.reduce((a, r) => a + r.fp, 0);
  return { rows, total };
}

/* ------------------------------------------------------------------ */
/* 보정계수                                                             */
/* ------------------------------------------------------------------ */

export function sizeFactor(fp: number): number {
  if (fp < 500) return 1.28;
  if (fp > 3000) return 1.153;
  return 0.4057 * Math.pow(Math.log(fp) - 7.1978, 2) + 0.8878;
}

export function linkFactor(n: number): number {
  if (n <= 0) return 0.88;
  if (n <= 2) return 0.94;
  if (n <= 5) return 1.0;
  if (n <= 10) return 1.06;
  return 1.12;
}

export function linkLabel(n: number): string {
  if (n <= 0) return "타 시스템 연계 없음";
  if (n <= 2) return "1~2개 연계";
  if (n <= 5) return "3~5개 연계";
  if (n <= 10) return "6~10개 연계";
  return "10개 초과 연계";
}

/* ------------------------------------------------------------------ */
/* 산정 방식 1: 기능점수 간이법 (공공 표준)                               */
/* ------------------------------------------------------------------ */

export function calcFpMethod(fp: number, input: EstimateInput) {
  const factors = {
    size: sizeFactor(fp),
    link: linkFactor(input.externalLinks),
    perf: PERF_FACTORS[input.perfLevel - 1],
    env: ENV_FACTORS[input.envLevel - 1],
    sec: SEC_FACTORS[input.secLevel - 1],
  };
  const factor = factors.size * factors.link * factors.perf * factors.env * factors.sec;
  const baseCost = fp * FP_UNIT_PRICE; // 보정 전 개발원가
  const devCost = baseCost * factor; // 개발원가
  const profit = devCost * input.profitRate; // 이윤
  const total = devCost + profit; // 직접경비 0 가정
  return { factors, factor, baseCost, devCost, profit, total };
}

/* ------------------------------------------------------------------ */
/* 투입공수 환산 및 역할 구성                                            */
/* ------------------------------------------------------------------ */

interface RoleDef {
  key: string;
  label: string;
  share: number;
  kosa: KosaRole;
  grades: { grade: Grade; weight: number }[];
}

export function roleMix(mobile: boolean, stack: Stack = "java"): RoleDef[] {
  if (stack === "sap") {
    return [
      { key: "pm", label: "PM·사업관리", share: 0.08, kosa: "pm", grades: [{ grade: "특급", weight: 1 }] },
      { key: "arch", label: "SAP 아키텍트·Basis", share: 0.08, kosa: "architect", grades: [{ grade: "특급", weight: 1 }] },
      { key: "analyst", label: "SAP 업무 컨설턴트", share: 0.18, kosa: "analyst", grades: [{ grade: "고급", weight: 0.5 }, { grade: "특급", weight: 0.5 }] },
      {
        key: "dev",
        label: "ABAP 개발",
        share: 0.5,
        kosa: "appDev",
        grades: [
          { grade: "중급", weight: 0.3 },
          { grade: "고급", weight: 0.5 },
          { grade: "특급", weight: 0.2 },
        ],
      },
      { key: "uiux", label: mobile ? "Fiori·UI5 (모바일 포함)" : "Fiori·UI5", share: 0.06, kosa: "uiux", grades: [{ grade: "고급", weight: 1 }] },
      {
        key: "test",
        label: "테스트·품질",
        share: 0.1,
        kosa: "tester",
        grades: [
          { grade: "중급", weight: 0.6 },
          { grade: "고급", weight: 0.4 },
        ],
      },
    ];
  }
  const uiShare = mobile ? 0.15 : 0.1;
  const devShare = mobile ? 0.47 : 0.52;
  return [
    { key: "pm", label: "PM·사업관리", share: 0.08, kosa: "pm", grades: [{ grade: "특급", weight: 1 }] },
    { key: "arch", label: "아키텍트·DB 설계", share: 0.05, kosa: "architect", grades: [{ grade: "특급", weight: 1 }] },
    { key: "analyst", label: "업무분석·설계", share: 0.15, kosa: "analyst", grades: [{ grade: "고급", weight: 1 }] },
    {
      key: "dev",
      label: "개발 (Java / PostgreSQL)",
      share: devShare,
      kosa: "appDev",
      grades: [
        { grade: "중급", weight: 0.6 },
        { grade: "고급", weight: 0.4 },
      ],
    },
    { key: "uiux", label: mobile ? "UI/UX·퍼블리싱 (모바일 포함)" : "UI/UX·퍼블리싱", share: uiShare, kosa: "uiux", grades: [{ grade: "중급", weight: 1 }] },
    {
      key: "test",
      label: "테스트·품질",
      share: 0.1,
      kosa: "tester",
      grades: [
        { grade: "초급", weight: 0.7 },
        { grade: "중급", weight: 0.3 },
      ],
    },
  ];
}

export interface EffortRow {
  key: string;
  label: string;
  mm: number;
  kosaMonthly: number;
  kosaCost: number;
  gradeText: string;
  marketLow: number;
  marketHigh: number;
}

export function calcEffort(fp: number, input: EstimateInput) {
  const stack = input.stack ?? "java";
  const productivity = productivityOf(input);
  const grades = marketGradesOf(stack);
  const totalMM = fp / Math.max(1, productivity);
  const rows: EffortRow[] = roleMix(input.mobile, stack).map((r) => {
    const mm = totalMM * r.share;
    const kosaMonthly = KOSA_WAGE[r.kosa].monthly;
    const low = r.grades.reduce((a, g) => a + grades[g.grade].low * g.weight, 0);
    const high = r.grades.reduce((a, g) => a + grades[g.grade].high * g.weight, 0);
    return {
      key: r.key,
      label: r.label,
      mm,
      kosaMonthly,
      kosaCost: mm * kosaMonthly,
      gradeText: r.grades.map((g) => (g.weight === 1 ? g.grade : `${g.grade} ${Math.round(g.weight * 100)}%`)).join(" · "),
      marketLow: mm * low,
      marketHigh: mm * high,
    };
  });
  const kosaDirect = rows.reduce((a, r) => a + r.kosaCost, 0);
  const marketLow = rows.reduce((a, r) => a + r.marketLow, 0);
  const marketHigh = rows.reduce((a, r) => a + r.marketHigh, 0);
  return { totalMM, rows, kosaDirect, marketLow, marketHigh };
}

/* ------------------------------------------------------------------ */
/* 산정 방식 2: KOSA 평균임금 × 공수                                     */
/* ------------------------------------------------------------------ */

/**
 * 가이드의 투입공수 방식(기획·운영 사업용) 산식을 참고로 환산한다.
 * 직접인건비 + 제경비(직접인건비의 140~150%) + 기술료((직접인건비+제경비)의 20~40%)
 * 하한(140%, 20%)을 적용한다.
 */
export function calcKosaMethod(kosaDirect: number) {
  const overhead = kosaDirect * 1.4;
  const techFee = (kosaDirect + overhead) * 0.2;
  return { direct: kosaDirect, overhead, techFee, publicTotal: kosaDirect + overhead + techFee };
}

/* ------------------------------------------------------------------ */
/* 산정 방식 3: 민간 SI 시세 × 공수                                      */
/* ------------------------------------------------------------------ */

export function calcMarketMethod(marketLow: number, marketHigh: number, vendorOverhead: number) {
  const k = 1 + vendorOverhead;
  return {
    laborLow: marketLow,
    laborHigh: marketHigh,
    quoteLow: marketLow * k,
    quoteHigh: marketHigh * k,
    quoteMid: ((marketLow + marketHigh) / 2) * k,
  };
}

/* ------------------------------------------------------------------ */
/* 일정                                                                 */
/* ------------------------------------------------------------------ */

export function calcSchedule(totalMM: number) {
  const months = Math.max(2, Math.round(2.5 * Math.cbrt(Math.max(totalMM, 1))));
  const headcount = Math.max(2, Math.ceil(totalMM / months));
  return { months, headcount };
}

/* ------------------------------------------------------------------ */
/* 클라우드 인프라 월 비용 (개인정보 미포함, 참고치)                      */
/* ------------------------------------------------------------------ */

export interface InfraEstimate {
  tier: "소" | "중" | "대" | "특대";
  monthlyLow: number;
  monthlyHigh: number;
  items: string[];
  note: string;
}

export function calcInfra(users: number, dataGb: number, stack: Stack = "java"): InfraEstimate {
  if (stack === "sap") return calcInfraSap(users, dataGb);
  if (users <= 50 && dataGb <= 50) {
    return {
      tier: "소",
      monthlyLow: 400_000,
      monthlyHigh: 700_000,
      items: [
        "WAS 1대 (2vCPU / 8GB)",
        "관리형 PostgreSQL 1대 (2vCPU / 8GB, 자동 백업)",
        "로드밸런서 1식, 오브젝트 스토리지 100GB",
        "모니터링·로그 기본형",
      ],
      note: "단일 구성. 장애 시 수동 복구를 허용하는 사내 업무용 규모.",
    };
  }
  if (users <= 300 && dataGb <= 500) {
    return {
      tier: "중",
      monthlyLow: 1_200_000,
      monthlyHigh: 2_000_000,
      items: [
        "WAS 2대 (4vCPU / 16GB) 이중화",
        "관리형 PostgreSQL HA (4vCPU / 16GB, 스탠바이 포함)",
        "로드밸런서, 오브젝트 스토리지 500GB, 백업 보관",
        "모니터링·로그, 개발/검증 환경 소형 1식",
      ],
      note: "업무시간 중 무중단을 전제로 한 일반적인 계열사 업무 시스템 규모.",
    };
  }
  if (users > 1000 || dataGb > 2500) {
    return {
      tier: "특대",
      monthlyLow: 8_000_000,
      monthlyHigh: 15_000_000,
      items: [
        "WAS 4~6대 (8vCPU / 32GB) 오토스케일, 배치·집계 전용 서버 별도",
        "관리형 PostgreSQL HA 대형 (16vCPU / 64GB+) + 읽기 복제본 2대",
        "집계·분석용 DB(컬럼형 또는 파티셔닝) 1식, Redis 캐시 클러스터",
        "오브젝트 스토리지 5TB+, 로드밸런서, 백업 장기 보관",
        "모니터링·로그·APM, 개발/검증/스테이징 환경 별도",
      ],
      note: "수백만 고객 × 수 TB 거래 이력, 또는 동시 1,000명 초과. 집계 주기와 보관 기간에 따라 상한을 크게 넘을 수 있어 아키텍처 검토 후 재산정 권장.",
    };
  }
  return {
    tier: "대",
    monthlyLow: 3_000_000,
    monthlyHigh: 5_500_000,
    items: [
      "WAS 3~4대 (8vCPU / 32GB) 오토스케일",
      "관리형 PostgreSQL HA (8vCPU / 32GB) + 읽기 복제본",
      "Redis 캐시, 로드밸런서, 오브젝트 스토리지 2TB",
      "모니터링·로그·APM, 개발/검증 환경 별도",
    ],
    note: "동시 사용자 수백 명 이상 또는 대용량 데이터. 트래픽에 따라 상한을 넘을 수 있음.",
  };
}

function calcInfraSap(users: number, dataGb: number): InfraEstimate {
  if (users <= 50 && dataGb <= 50) {
    return {
      tier: "소",
      monthlyLow: 3_000_000,
      monthlyHigh: 6_000_000,
      items: ["SAP 애플리케이션 서버 소형 1식", "HANA DB 소형 (라이선스·운영 별도 협의)", "개발/검증 환경 최소 구성"],
      note: "SAP HANA 운영비 참고치. 라이선스·AMS는 미포함이며 규모에 따라 크게 달라집니다.",
    };
  }
  if (users <= 300 && dataGb <= 500) {
    return {
      tier: "중",
      monthlyLow: 8_000_000,
      monthlyHigh: 15_000_000,
      items: ["SAP 애플리케이션 서버 이중화", "HANA DB HA 중형", "개발/검증 환경, 백업·모니터링"],
      note: "SAP HANA 운영비 참고치. 라이선스·AMS는 미포함.",
    };
  }
  if (users > 1000 || dataGb > 2500) {
    return {
      tier: "특대",
      monthlyLow: 40_000_000,
      monthlyHigh: 70_000_000,
      items: ["SAP 애플리케이션 서버 다중 인스턴스", "HANA DB 대형 HA + 재해복구", "집계·리포팅용 BW/분석 엔진, 개발/검증/스테이징"],
      note: "대규모 HANA 운영 참고치. 라이선스·하드웨어 상한은 아키텍처 검토 후 재산정.",
    };
  }
  return {
    tier: "대",
    monthlyLow: 20_000_000,
    monthlyHigh: 35_000_000,
    items: ["SAP 애플리케이션 서버 다중 구성", "HANA DB HA 대형", "개발/검증 환경, 백업·DR 기본"],
    note: "SAP HANA 운영비 참고치. 라이선스·AMS는 미포함.",
  };
}

/* ------------------------------------------------------------------ */
/* 종합                                                                 */
/* ------------------------------------------------------------------ */

export function estimate(input: EstimateInput) {
  const rawCounts = deriveCounts(input);
  const coverage = input.inputCoverage ?? 1;
  const counts = scaleCounts(rawCounts, coverage);
  const rawFp = calcFunctionPoints(rawCounts).total;
  const fpResult = calcFunctionPoints(counts);
  const fp = fpResult.total;
  const stack = input.stack ?? "java";
  const productivity = productivityOf(input);
  const fpMethod = calcFpMethod(fp, input);
  const effort = calcEffort(fp, input);
  const kosa = calcKosaMethod(effort.kosaDirect);
  const market = calcMarketMethod(effort.marketLow, effort.marketHigh, input.vendorOverhead);
  const schedule = calcSchedule(effort.totalMM);
  const infra = calcInfra(input.concurrentUsers, input.dataGb, stack);

  // 합리적 범위: 시장 견적 하단 ~ 공공 표준(이윤 반영)
  const rangeLow = Math.min(market.quoteLow, fpMethod.total);
  const rangeHigh = Math.max(market.quoteHigh, fpMethod.total);
  const reference = fpMethod.total;
  const maintenanceYearLow = reference * 0.12;
  const maintenanceYearHigh = reference * 0.15;

  return {
    counts,
    rawCounts,
    rawFp,
    inputCoverage: coverage,
    fpResult,
    fp,
    fpMethod,
    effort,
    kosa,
    market,
    schedule,
    infra,
    rangeLow,
    rangeHigh,
    reference,
    maintenanceYearLow,
    maintenanceYearHigh,
    stack,
    productivity,
  };
}

export type EstimateResult = ReturnType<typeof estimate>;

/* ------------------------------------------------------------------ */
/* 표시용 유틸                                                           */
/* ------------------------------------------------------------------ */

/** 원 → "93,840,000원" (천 단위 콤마) */
export function fmtKRW(won: number): string {
  if (!isFinite(won)) return "-";
  const n = Math.round(won);
  if (n === 0) return "0원";
  return `${n.toLocaleString("ko-KR")}원`;
}

export function fmtNum(n: number, digits = 1): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
