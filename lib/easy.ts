/**
 * 현업용 쉬운 입력 → 기능점수 산정 입력 변환
 *
 * 현업은 ILF/EI 같은 용어를 모른다. 대신
 *  - 어떤 종류의 시스템인지(유형)
 *  - 누가 쓰는지, 어떤 정보를 다루는지, 승인·알림·리포트·첨부가 있는지
 *  - 고객 수·매출 규모·집계 강도·자동 액션처럼 유통/리테일 시스템의 무게를 좌우하는 요소
 *  - 어떤 시스템과 연결되는지, 몇 명이 쓰는지
 * 를 선택지로 답하게 하고, 여기서 기능 개수를 규칙으로 추정한다.
 * 설명문에서 키워드를 찾아 선택지를 미리 채워 주는 "추가 질문" 역할도 한다.
 */

import { DEFAULT_INPUT, type EstimateInput, type FunctionCounts, type Level } from "./estimate";

/* ------------------------------------------------------------------ */
/* 선택지 정의                                                           */
/* ------------------------------------------------------------------ */

export type SystemKind =
  | "erp"
  | "scm"
  | "fcm"
  | "campaign"
  | "brand_membership"
  | "unified_membership"
  | "channel"
  | "request"
  | "report"
  | "portal"
  | "other";
export type Approval = "none" | "single" | "multi" | "conditional";
export type Notify = "none" | "mail" | "messenger" | "both";
export type Report = "none" | "excel" | "stats" | "dashboard";
export type UserScale = "s" | "m" | "l" | "xl";
export type CustomerScale = "none" | "c50" | "c200" | "c500" | "c1000" | "c2000" | "c2000p";
export type SalesScale = "none" | "s1000" | "s5000" | "s1t" | "s5t" | "s10t";
export type DataVolume = "low" | "mid" | "high" | "xl" | "xxl";
export type Aggregation = "none" | "light" | "heavy" | "massive";
export type AutomationKey = "batch" | "event" | "campaign" | "rule";
export type Speed = "normal" | "fast";
export type Coverage = 0.6 | 0.7 | 0.9 | 1;

export interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
}

export const KIND_OPTIONS: (Option<SystemKind> & { example: string; title: string; desc: string })[] = [
  {
    value: "erp",
    label: "SAP ERP 신규·재구축",
    example: "구매(MM)·판매(SD)·생산(PP)·회계(FI/CO)",
    title: "SAP ERP 구매·판매·회계 통합",
    desc: "그룹사 구매요청→발주→입고→송장, 판매오더→출하→매출, 재무 전표·원가센터를 SAP ERP로 한곳에서 돌린다. 조직·자재·거래처 마스터와 결재, 플랜트별 권한이 필요하고, 기존 레거시 재고·채권 데이터를 이관한다. 동시 접속은 본사·공장 합쳐 약 800명 수준이다.",
  },
  {
    value: "scm",
    label: "SCM(공급망·물류) 시스템",
    example: "창고·출하·수송·납기·WMS 연계",
    title: "SCM 물류·창고·납기 관리 시스템",
    desc: "공장·물류센터 재고, 출하 지시, 수송 배차, 납기 약속을 관리한다. WMS·운송사와 입고/출고를 주고받고, 미결·지연을 대시보드로 보며 야간에 재고 스냅샷을 적재한다. 플랜트·창고 담당자와 물류기획이 함께 쓴다.",
  },
  {
    value: "fcm",
    label: "FCM(재무·자금·원가) 시스템",
    example: "자금시재, 원가집계, 결산보조, 예산",
    title: "FCM 자금·원가·결산 보조 시스템",
    desc: "일일 자금시재, 계좌·차입, 원가 집계, 월결산 보조 자료를 다룬다. SAP FI/CO 전표·원가센터와 연계하고, 경영진용 요약과 담당자용 엑셀 다운로드가 필요하다. 마감 기간에는 응답이 느려지면 안 된다.",
  },
  {
    value: "campaign",
    label: "캠페인·타겟팅 시스템",
    example: "조건 추출, 쿠폰, 카카오·Push 발송, 성과 분석",
    title: "고객·매출 분석·캠페인 시스템",
    desc: "1년 내 구매이력이 있는 650만 고객의 24개월치 매출(연 약 2조)을 브랜드별, 상품별, 스타일별로 집계해서 대시보드로 본다. POS 결제 데이터와 온라인몰 주문을 매일 밤 받아오고, 마케터가 조건을 직접 설정해 캠페인 대상을 뽑아 카카오 알림톡과 앱 Push로 발송한다. 캠페인 기간에 고객이 구매하면 즉시 할인쿠폰을 Push로 보내준다. 거래 상세는 약 5TB다.",
  },
  {
    value: "brand_membership",
    label: "브랜드 멤버십 구축",
    example: "브랜드별 회원·등급·포인트·쿠폰",
    title: "브랜드 멤버십 시스템",
    desc: "단일 브랜드 기준으로 회원 가입·등급·포인트 적립/사용·쿠폰을 운영한다. 매장 POS와 자사몰 주문을 받아 구매 이력을 붙이고, 등급 산정·소멸 배치, 마이페이지·앱 조회가 필요하다. 회원 약 200만, 포인트·쿠폰 이력은 수년치 보관한다.",
  },
  {
    value: "unified_membership",
    label: "통합 멤버십 구축",
    example: "다브랜드 통합 회원·포인트·동의·SSO",
    title: "그룹 통합 멤버십 시스템",
    desc: "여러 브랜드 회원을 하나의 통합 ID로 묶고, 포인트·등급·마케팅 동의를 공통으로 관리한다. 브랜드 멤버십·POS·온라인몰·앱과 실시간·배치로 동기화하고, 브랜드 간 포인트 전환·통합 로그인(SSO)·고객 360 조회가 필요하다. 통합 회원 약 650만 명 규모다.",
  },
  {
    value: "channel",
    label: "채널서버(카카오·메시지 발송)",
    example: "브랜드톡·알림톡·SMS·Push 발송 중계",
    title: "채널서버(카카오 브랜드톡 발송) 구축",
    desc: "캠페인·멤버십·주문 시스템에서 넘긴 발송 요청을 받아 카카오 브랜드톡·알림톡, SMS/LMS, 앱 Push로 중계한다. 템플릿·발송 한도·실패 재시도·수신거부·발송 이력·실시간 모니터링이 필요하고, 피크 시간에도 지연이 없어야 한다. 일 수백만 건 발송을 가정한다.",
  },
  {
    value: "request",
    label: "신청·품의·결재 업무 시스템",
    example: "구매요청, 투자품의, 예산전용, 경비",
    title: "구매요청·투자품의 결재 시스템",
    desc: "현업이 구매요청·투자품의를 올리면 팀장→본부장 결재 후 ERP 발주·예산 반영으로 넘긴다. 금액 구간별 결재선, 증빙 첨부, 메일·메신저 알림, 월별 진행 현황 엑셀이 필요하다.",
  },
  {
    value: "report",
    label: "경영·실적 대시보드",
    example: "ERP/SCM/FCM KPI, 재고·매출·자금 현황",
    title: "ERP·SCM·FCM 통합 실적 대시보드",
    desc: "ERP 매출·매입, SCM 재고·납기, FCM 자금·원가를 모아 KPI 차트와 월별 통계를 보여 준다. 임원은 요약만 보고, 기획·재무는 엑셀로 내려받는다. 매일 밤 DW로 집계한다.",
  },
  {
    value: "portal",
    label: "업무 포털·자료 게시",
    example: "SAP 업무 안내, 매뉴얼, 공지, FAQ",
    title: "SAP 업무 포털·매뉴얼 자료실",
    desc: "ERP/SCM/FCM 업무 공지와 매뉴얼을 올리고 플랜트·부서 담당자가 조회한다. 첨부 업로드와 새 글 메일 알림이 있다.",
  },
  {
    value: "other",
    label: "위에 없음 / 잘 모르겠음",
    example: "아래 질문에 답하면 됩니다",
    title: "",
    desc: "",
  },
];

export const USER_GROUP_OPTIONS: Option<string>[] = [
  { value: "staff", label: "일반 임직원", desc: "신청·조회 등 기본 사용" },
  { value: "manager", label: "팀장·담당자(관리자)", desc: "승인, 데이터 관리, 설정" },
  { value: "exec", label: "임원·경영진", desc: "요약 현황만 보는 사용자" },
  { value: "external", label: "협력사·외부 사용자", desc: "사내망 밖에서 접속하는 사람" },
];

export const DATA_KIND_OPTIONS: Option<string>[] = [
  { value: "form", label: "신청서·품의·요청서" },
  { value: "person", label: "임직원·조직·권한" },
  { value: "partner", label: "거래처·공급사·고객사" },
  { value: "material", label: "자재·BOM·플랜트 마스터" },
  { value: "inventory", label: "재고·입출고·창고" },
  { value: "order", label: "발주·판매오더·출하" },
  { value: "finance", label: "전표·원가·자금시재" },
  { value: "contract", label: "계약·단가·협정" },
  { value: "amount", label: "예산·정산·비용" },
  { value: "product", label: "브랜드·상품·스타일 마스터" },
  { value: "coupon", label: "쿠폰·포인트·캠페인" },
  { value: "member", label: "회원·등급·동의" },
  { value: "store", label: "매장·채널 정보" },
  { value: "template", label: "발송 템플릿·한도" },
  { value: "doc", label: "공지·매뉴얼·자료" },
  { value: "asset", label: "설비·자산·비품" },
];

export const CUSTOMER_OPTIONS: Option<CustomerScale>[] = [
  { value: "none", label: "고객 데이터 없음", desc: "임직원·사내 데이터만 다룸" },
  { value: "c50", label: "50만 명 이하" },
  { value: "c200", label: "200만 명 이하" },
  { value: "c500", label: "500만 명 이하" },
  { value: "c1000", label: "1,000만 명 이하", desc: "예: 650만 고객" },
  { value: "c2000", label: "2,000만 명 이하" },
  { value: "c2000p", label: "2,000만 명 초과" },
];

export const SALES_OPTIONS: Option<SalesScale>[] = [
  { value: "none", label: "매출 데이터 없음" },
  { value: "s1000", label: "1,000억 원 이하" },
  { value: "s5000", label: "5,000억 원 이하" },
  { value: "s1t", label: "1조 원 이하" },
  { value: "s5t", label: "5조 원 이하" },
  { value: "s10t", label: "10조 원 이상" },
];

export const APPROVAL_OPTIONS: Option<Approval>[] = [
  { value: "none", label: "없음", desc: "등록하면 바로 반영" },
  { value: "single", label: "1단계", desc: "팀장 1명이 승인·반려" },
  { value: "multi", label: "2단계 이상", desc: "팀장 → 본부장처럼 순서대로" },
  { value: "conditional", label: "조건에 따라 달라짐", desc: "금액·부서별로 결재선이 바뀜" },
];

export const NOTIFY_OPTIONS: Option<Notify>[] = [
  { value: "none", label: "없음", desc: "시스템에 들어와서 확인" },
  { value: "mail", label: "이메일" },
  { value: "messenger", label: "사내 메신저" },
  { value: "both", label: "이메일 + 사내 메신저" },
];

export const REPORT_OPTIONS: Option<Report>[] = [
  { value: "none", label: "없음", desc: "화면에서 목록만 보면 됨" },
  { value: "excel", label: "목록 엑셀 다운로드" },
  { value: "stats", label: "월별·부서별 통계 화면", desc: "집계표, 간단한 그래프" },
  { value: "dashboard", label: "대시보드(차트 여러 개)", desc: "KPI, 추이, 비교 차트" },
];

export const AGGREGATION_OPTIONS: Option<Aggregation>[] = [
  { value: "none", label: "없음", desc: "목록 조회 수준" },
  { value: "light", label: "가벼움", desc: "월별·부서별 합계, 수십만 건 이하" },
  { value: "heavy", label: "무거움", desc: "재고·원가 또는 수백만 고객×브랜드·상품 다차원 집계" },
  { value: "massive", label: "매우 무거움", desc: "수천만 건 이상 다차원 집계를 수시로 재계산, 집계 전용 DB 필요" },
];

export const AUTOMATION_OPTIONS: Option<AutomationKey>[] = [
  { value: "batch", label: "정해진 시간에 자동 처리", desc: "야간 집계·등급 산정·마감, 인터페이스 재처리" },
  { value: "event", label: "실시간 이벤트 액션", desc: "구매·가입·발송 요청 시 즉시 쿠폰·알림·반영" },
  { value: "campaign", label: "캠페인·대상 추출·일괄 발송", desc: "조건으로 고객·오더를 뽑아 카카오·SMS·Push·일괄 처리" },
  { value: "rule", label: "현업이 조건·규칙을 직접 설정", desc: "캠페인·쿠폰·결재선·발송 시나리오를 화면에서 설정" },
];

export interface IntegrationOption extends Option<string> {
  /** 연계 1건이 만드는 기능 수: 외부참조 데이터 / 수신·처리 / 송신·출력 */
  w: { eif: number; ei: number; eo: number };
  heavy?: boolean;
}

export const INTEGRATION_OPTIONS: IntegrationOption[] = [
  { value: "hr", label: "인사·조직(사번·부서)", desc: "임직원·조직도를 가져옴", w: { eif: 1, ei: 0, eo: 0 } },
  { value: "sso", label: "그룹웨어·SSO 로그인", desc: "별도 비밀번호 없이 로그인", w: { eif: 1, ei: 1, eo: 0 } },
  { value: "erp", label: "SAP ERP(MM/SD/FI 등)", desc: "발주·판매·전표·마스터", w: { eif: 2, ei: 1, eo: 1 }, heavy: true },
  { value: "scm", label: "SCM·WMS·물류", desc: "재고·입출고·수송 연계", w: { eif: 2, ei: 2, eo: 1 }, heavy: true },
  { value: "fcm", label: "FCM·자금·원가", desc: "시재·원가·결산 보조 데이터", w: { eif: 2, ei: 1, eo: 1 }, heavy: true },
  { value: "mes", label: "MES·생산실적", desc: "공장 실적·설비 데이터", w: { eif: 2, ei: 2, eo: 0 }, heavy: true },
  { value: "bank", label: "은행·펌뱅킹", desc: "입출금·이체 전문", w: { eif: 1, ei: 1, eo: 2 }, heavy: true },
  { value: "channel", label: "채널서버·메시지 발송", desc: "카카오 브랜드톡·알림톡·SMS·Push", w: { eif: 1, ei: 1, eo: 3 }, heavy: true },
  { value: "pos", label: "POS·결제 시스템", desc: "매장 거래·결제·취소 데이터 수신", w: { eif: 2, ei: 2, eo: 1 }, heavy: true },
  { value: "crm", label: "멤버십·CRM", desc: "회원, 등급, 포인트, 동의", w: { eif: 2, ei: 1, eo: 0 }, heavy: true },
  { value: "mall", label: "온라인몰·주문 시스템", desc: "온라인 주문·배송 데이터", w: { eif: 2, ei: 1, eo: 0 }, heavy: true },
  { value: "dw", label: "DW·BI", desc: "집계 결과를 분석 플랫폼으로 전달", w: { eif: 0, ei: 0, eo: 2 } },
  { value: "mail", label: "메일 서버", desc: "사내 알림 메일 발송", w: { eif: 0, ei: 0, eo: 1 } },
  { value: "messenger", label: "사내 메신저", desc: "담당자에게 메시지 발송", w: { eif: 0, ei: 0, eo: 1 } },
  { value: "other", label: "그 외 다른 시스템", w: { eif: 1, ei: 1, eo: 0 } },
];

export const SCALE_OPTIONS: Option<UserScale>[] = [
  { value: "s", label: "50명 이하", desc: "한 팀·한 부서" },
  { value: "m", label: "300명 이하", desc: "한 본부·한 사업장" },
  { value: "l", label: "1,000명 이하", desc: "한 회사 전체" },
  { value: "xl", label: "1,000명 초과", desc: "여러 계열사" },
];

export const VOLUME_OPTIONS: Option<DataVolume>[] = [
  { value: "low", label: "100GB 이하", desc: "신청서·문서 위주, 수십만 건" },
  { value: "mid", label: "500GB 이하", desc: "수백만 건 거래 이력" },
  { value: "high", label: "1TB 이하", desc: "수천만 건, 수년치 이력" },
  { value: "xl", label: "5TB 이하", desc: "수백만 고객 × 수십 개월 거래 상세" },
  { value: "xxl", label: "5TB 초과", desc: "로그·이미지 포함 초대용량" },
];

export const SPEED_OPTIONS: Option<Speed>[] = [
  { value: "normal", label: "일반", desc: "1~3초 안에 뜨면 충분" },
  { value: "fast", label: "빠른 응답 필수", desc: "마감·이벤트 시간에 몰려도 느려지면 안 됨" },
];

export const COVERAGE_OPTIONS: Option<string>[] = [
  { value: "1", label: "있는 그대로", desc: "빠진 기능 없음 · 보정하지 않음" },
  { value: "0.9", label: "거의 다 적음", desc: "전체의 약 90%" },
  { value: "0.7", label: "주요 기능 위주", desc: "전체의 약 70%" },
  { value: "0.6", label: "큰 그림만", desc: "전체의 약 60% · 기본값" },
];

/* ------------------------------------------------------------------ */
/* 입력 모델                                                             */
/* ------------------------------------------------------------------ */

export interface EasyInput {
  title: string;
  description: string;
  kind: SystemKind | "";
  userGroups: string[];
  dataKinds: string[];
  customData: string;
  customerScale: CustomerScale;
  salesScale: SalesScale;
  approval: Approval;
  notify: Notify;
  report: Report;
  aggregation: Aggregation;
  automation: AutomationKey[];
  attachments: boolean;
  integrations: string[];
  mobile: boolean;
  userScale: UserScale;
  dataVolume: DataVolume;
  speed: Speed;
  /** 입력한 기능이 전체 대비 비율. 현업 기본은 큰 그림 0.6 */
  coverage: Coverage;
}

export const DEFAULT_EASY: EasyInput = {
  title: "",
  description: "",
  kind: "",
  userGroups: ["staff", "manager"],
  dataKinds: [],
  customData: "",
  customerScale: "none",
  salesScale: "none",
  approval: "none",
  notify: "none",
  report: "none",
  aggregation: "none",
  automation: [],
  attachments: false,
  integrations: ["hr", "sso"],
  mobile: false,
  userScale: "m",
  dataVolume: "low",
  speed: "normal",
  coverage: 0.6,
};

/** 유형을 고르면 채워지는 기본값 */
export const KIND_PRESETS: Record<SystemKind, Partial<EasyInput>> = {
  erp: {
    dataKinds: ["material", "partner", "order", "finance", "inventory"],
    approval: "multi",
    notify: "both",
    report: "dashboard",
    aggregation: "heavy",
    automation: ["batch"],
    integrations: ["hr", "sso", "erp", "scm", "fcm"],
    dataVolume: "high",
    speed: "fast",
    userScale: "l",
    attachments: true,
  },
  scm: {
    dataKinds: ["material", "inventory", "order", "partner"],
    approval: "single",
    notify: "messenger",
    report: "dashboard",
    aggregation: "heavy",
    automation: ["batch", "event"],
    integrations: ["hr", "sso", "erp", "scm", "mes"],
    dataVolume: "high",
    speed: "fast",
    userScale: "l",
  },
  fcm: {
    dataKinds: ["finance", "amount", "partner"],
    approval: "multi",
    notify: "mail",
    report: "stats",
    aggregation: "heavy",
    automation: ["batch"],
    integrations: ["hr", "sso", "erp", "fcm", "bank"],
    dataVolume: "mid",
    speed: "fast",
    userScale: "m",
  },
  campaign: {
    dataKinds: ["product", "coupon", "store", "member"],
    customerScale: "c1000",
    salesScale: "s1t",
    aggregation: "heavy",
    automation: ["batch", "campaign", "event", "rule"],
    integrations: ["hr", "sso", "channel", "pos", "crm", "mall"],
    report: "dashboard",
    dataVolume: "xl",
    speed: "fast",
    approval: "single",
    userScale: "m",
  },
  brand_membership: {
    dataKinds: ["member", "coupon", "product", "store"],
    customerScale: "c200",
    salesScale: "s5000",
    aggregation: "heavy",
    automation: ["batch", "event"],
    integrations: ["hr", "sso", "pos", "mall", "channel", "crm"],
    report: "stats",
    dataVolume: "high",
    speed: "fast",
    mobile: true,
    userScale: "m",
  },
  unified_membership: {
    dataKinds: ["member", "coupon", "product", "store"],
    customerScale: "c1000",
    salesScale: "s1t",
    aggregation: "heavy",
    automation: ["batch", "event", "rule"],
    integrations: ["hr", "sso", "pos", "mall", "channel", "crm"],
    report: "dashboard",
    dataVolume: "xl",
    speed: "fast",
    mobile: true,
    userScale: "l",
  },
  channel: {
    dataKinds: ["template", "member"],
    customerScale: "c1000",
    aggregation: "light",
    automation: ["batch", "event"],
    integrations: ["sso", "crm", "channel"],
    report: "stats",
    dataVolume: "high",
    speed: "fast",
    userScale: "s",
  },
  request: { dataKinds: ["form", "amount", "person"], approval: "conditional", notify: "both", report: "excel", attachments: true, integrations: ["hr", "sso", "erp"] },
  report: { dataKinds: ["amount", "inventory", "finance"], integrations: ["hr", "sso", "erp", "scm", "fcm", "dw"], aggregation: "heavy", report: "dashboard", automation: ["batch"] },
  portal: { dataKinds: ["doc"], notify: "mail", attachments: true, integrations: ["hr", "sso"] },
  other: {},
};

/* ------------------------------------------------------------------ */
/* 설명문 키워드 분석 (추가 질문 역할)                                     */
/* ------------------------------------------------------------------ */

interface Hint {
  re: RegExp;
  label: string | ((m: RegExpMatchArray, e: EasyInput) => string);
  apply: (e: EasyInput, m: RegExpMatchArray) => EasyInput;
}

const add = <T extends string>(arr: T[], v: T): T[] => (arr.includes(v) ? arr : [...arr, v]);
const rank = <T extends string>(order: T[], a: T, b: T): T => (order.indexOf(a) >= order.indexOf(b) ? a : b);
const APPROVAL_ORDER: Approval[] = ["none", "single", "multi", "conditional"];
const REPORT_ORDER: Report[] = ["none", "excel", "stats", "dashboard"];
const AGG_ORDER: Aggregation[] = ["none", "light", "heavy", "massive"];
const VOL_ORDER: DataVolume[] = ["low", "mid", "high", "xl", "xxl"];
const CUST_ORDER: CustomerScale[] = ["none", "c50", "c200", "c500", "c1000", "c2000", "c2000p"];
const SALES_ORDER: SalesScale[] = ["none", "s1000", "s5000", "s1t", "s5t", "s10t"];

const num = (s: string) => Number(s.replace(/,/g, ""));

function customerScaleOf(count: number): CustomerScale {
  if (count <= 500_000) return "c50";
  if (count <= 2_000_000) return "c200";
  if (count <= 5_000_000) return "c500";
  if (count <= 10_000_000) return "c1000";
  if (count <= 20_000_000) return "c2000";
  return "c2000p";
}

function salesScaleOf(eok: number): SalesScale {
  if (eok <= 1000) return "s1000";
  if (eok <= 5000) return "s5000";
  if (eok <= 10_000) return "s1t";
  if (eok <= 50_000) return "s5t";
  return "s10t";
}

const HINTS: Hint[] = [
  // 규모 숫자
  {
    re: /(\d+(?:[.,]\d+)?)\s*(천만|백만|만)?\s*(?:명의?\s*)?(고객|회원|가입자|멤버)/,
    label: (m) => `고객 ${m[1]}${m[2] ?? ""} 명`,
    apply: (e, m) => {
      const unit = m[2] === "천만" ? 10_000_000 : m[2] === "백만" ? 1_000_000 : m[2] === "만" ? 10_000 : 1;
      return { ...e, customerScale: rank(CUST_ORDER, e.customerScale, customerScaleOf(num(m[1]) * unit)) };
    },
  },
  {
    re: /(\d+(?:[.,]\d+)?)\s*(조|천억|억)\s*(?:원)?/,
    label: (m) => `매출 규모 ${m[1]}${m[2]}`,
    apply: (e, m) => {
      const eok = num(m[1]) * (m[2] === "조" ? 10_000 : m[2] === "천억" ? 1000 : 1);
      return { ...e, salesScale: rank(SALES_ORDER, e.salesScale, salesScaleOf(eok)) };
    },
  },
  { re: /고객|회원|소비자|멤버십/, label: "고객 데이터", apply: (e) => (e.customerScale === "none" ? { ...e, customerScale: "c50" } : e) },
  { re: /매출|판매|거래\s*(데이터|이력|내역)|구매\s*이력/, label: "매출 데이터", apply: (e) => (e.salesScale === "none" ? { ...e, salesScale: "s1000" } : e) },
  { re: /(\d+)\s*(TB|테라)/i, label: "TB 단위 데이터", apply: (e, m) => ({ ...e, dataVolume: rank(VOL_ORDER, e.dataVolume, Number(m[1]) > 5 ? "xxl" : "xl") }) },

  // 집계·자동화
  { re: /브랜드별|스타일별|상품별|품목별|다차원|대량\s*집계|수백만.*집계|\d+\s*개월치/, label: "대량 다차원 집계", apply: (e) => ({ ...e, aggregation: rank(AGG_ORDER, e.aggregation, "heavy") }) },
  { re: /집계|통계|리포트|보고서|월별|부서별/, label: "통계·집계", apply: (e) => ({ ...e, report: rank(REPORT_ORDER, e.report, "stats"), aggregation: rank(AGG_ORDER, e.aggregation, "light") }) },
  { re: /실시간.*(입고|출고|재고|실적|발송|쿠폰|push|푸시)|(입고|출고|실적|구매|결제).*(즉시|바로|실시간)|(즉시).*(발송|쿠폰)/i, label: "실시간 이벤트 액션", apply: (e) => ({ ...e, automation: add(e.automation, "event") }) },
  { re: /캠페인|타겟팅|타깃|대상\s*추출|프로모션|세그먼트/, label: "캠페인 대상 추출·발송", apply: (e) => ({ ...e, automation: add(e.automation, "campaign"), integrations: add(e.integrations, "channel") }) },
  { re: /규칙|조건을?\s*(직접|설정)|시나리오|BADI|Enhancement/i, label: "규칙·확장 설정", apply: (e) => ({ ...e, automation: add(e.automation, "rule") }) },
  { re: /야간|배치|새벽|매일\s*(밤|아침|새벽)?|매주|매월|월말|주기적|정기적|스케줄|마감\s*처리/, label: "정해진 시간 자동 처리", apply: (e) => ({ ...e, automation: add(e.automation, "batch") }) },

  // 연계
  { re: /카카오|브랜드톡|알림톡|카톡|SMS|LMS|MMS|문자|푸시|push|앱\s*알림|채널\s*서버/i, label: "채널서버·메시지 발송", apply: (e) => ({ ...e, integrations: add(e.integrations, "channel") }) },
  { re: /POS|포스|결제|카드\s*승인|매장\s*거래/i, label: "POS·결제 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "pos") }) },
  { re: /온라인몰|쇼핑몰|이커머스|e-?commerce|자사몰|주문\s*시스템/i, label: "온라인몰 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "mall") }) },
  { re: /CRM|멤버십|회원\s*시스템|통합\s*회원|브랜드\s*멤버/i, label: "멤버십·CRM 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "crm") }) },
  { re: /WMS|창고\s*관리|물류\s*센터|출하|수송|SCM/i, label: "SCM·WMS 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "scm") }) },
  { re: /MES|생산\s*실적|설비\s*데이터/i, label: "MES 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "mes") }) },
  { re: /펌뱅킹|은행\s*연계|이체\s*전문|자금\s*시재/i, label: "은행·자금 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "bank") }) },
  { re: /FCM|원가\s*집계|결산\s*보조/i, label: "FCM 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "fcm") }) },
  { re: /DW|데이터\s*웨어하우스|BI|태블로|tableau/i, label: "DW·BI 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "dw") }) },
  { re: /ERP|SAP|회계|전표|MM|SD|FI\/?CO|구매\s*오더|판매\s*오더/i, label: "SAP ERP 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "erp") }) },
  { re: /조직도|인사\s*(시스템|정보)|사번|HR/i, label: "인사 시스템 연계", apply: (e) => ({ ...e, integrations: add(e.integrations, "hr") }) },

  // 결재·알림·출력
  { re: /다단계|2단계|3단계|본부장|임원\s*결재|순차\s*(승인|결재)/, label: "2단계 이상 결재", apply: (e) => ({ ...e, approval: rank(APPROVAL_ORDER, e.approval, "multi") }) },
  { re: /금액에\s*따라|조건부\s*결재|결재선.*(달라|변경)/, label: "조건부 결재선", apply: (e) => ({ ...e, approval: "conditional" }) },
  { re: /승인|결재|반려|상신|허가|품의/, label: "승인 절차", apply: (e) => ({ ...e, approval: rank(APPROVAL_ORDER, e.approval, "single") }) },
  { re: /대시보드|차트|그래프|KPI|현황판/i, label: "대시보드·차트", apply: (e) => ({ ...e, report: "dashboard" }) },
  { re: /엑셀|excel|다운로드|내려받/i, label: "엑셀 다운로드", apply: (e) => ({ ...e, report: rank(REPORT_ORDER, e.report, "excel") }) },
  { re: /사내\s*메신저|슬랙|slack|teams|팀즈/i, label: "사내 메신저 알림", apply: (e) => ({ ...e, notify: e.notify === "mail" || e.notify === "both" ? "both" : "messenger", integrations: add(e.integrations, "messenger") }) },
  { re: /메일|이메일|e-?mail/i, label: "이메일 알림", apply: (e) => ({ ...e, notify: e.notify === "messenger" || e.notify === "both" ? "both" : "mail", integrations: add(e.integrations, "mail") }) },
  { re: /첨부|파일|업로드|사진|이미지|스캔|증빙/, label: "파일 첨부", apply: (e) => ({ ...e, attachments: true }) },
  { re: /모바일|스마트폰|휴대폰|핸드폰|태블릿/, label: "모바일 사용", apply: (e) => ({ ...e, mobile: true }) },

  // 사용자·데이터 종류
  { re: /협력사|외부\s*(사용자|업체|직원)|파트너사|가맹점/, label: "외부 사용자 접속", apply: (e) => ({ ...e, userGroups: add(e.userGroups, "external") }) },
  { re: /임원|경영진|CEO|대표이사|사장/i, label: "임원용 화면", apply: (e) => ({ ...e, userGroups: add(e.userGroups, "exec") }) },
  { re: /자재|BOM|플랜트|SKU/i, label: "자재·플랜트 마스터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "material") }) },
  { re: /재고|입고|출고|창고|저장위치/, label: "재고·입출고 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "inventory") }) },
  { re: /발주|판매\s*오더|출하|구매\s*요청/, label: "오더·출하 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "order") }) },
  { re: /전표|원가|자금|시재|결산/, label: "재무·원가·자금 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "finance") }) },
  { re: /쿠폰|포인트|적립|마일리지/, label: "쿠폰·포인트 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "coupon") }) },
  { re: /회원|등급|멤버십|동의\s*관리/, label: "회원·등급 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "member") }) },
  { re: /브랜드|스타일|상품|품목/i, label: "브랜드·상품 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "product") }) },
  { re: /매장|점포|채널별/, label: "매장·채널 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "store") }) },
  { re: /템플릿|발송\s*한도|브랜드톡/, label: "발송 템플릿·한도", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "template") }) },
  { re: /자산|비품|설비|장비/, label: "자산·설비 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "asset") }) },
  { re: /거래처|협력업체|공급사|벤더|고객사/, label: "거래처 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "partner") }) },
  { re: /계약|단가\s*협정/, label: "계약·단가 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "contract") }) },
  { re: /예산|비용|정산|지출|경비|청구/, label: "금액·정산 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "amount") }) },
  { re: /게시|공지|자료실|FAQ|매뉴얼/i, label: "게시글·공지 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "doc") }) },
  { re: /신청|요청|기안|품의/, label: "신청·품의 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "form") }) },
  { re: /임직원|사원|직원|부서|권한/, label: "임직원·조직 데이터", apply: (e) => ({ ...e, dataKinds: add(e.dataKinds, "person") }) },

  // 환경
  { re: /실시간|즉시|지연\s*없|마감.*몰|피크/, label: "빠른 응답 요구", apply: (e) => ({ ...e, speed: "fast" }) },
  { re: /전사|전\s*임직원|모든\s*직원|그룹사\s*전체|계열사\s*전체/, label: "전사 규모 사용자", apply: (e) => ({ ...e, userScale: e.userScale === "xl" ? "xl" : "l" }) },
];

export function applyHints(easy: EasyInput): { result: EasyInput; found: string[] } {
  const text = easy.description + " " + easy.title;
  let result = easy;
  const found: string[] = [];
  for (const h of HINTS) {
    const m = text.match(h.re);
    if (m) {
      result = h.apply(result, m);
      found.push(typeof h.label === "function" ? h.label(m, result) : h.label);
    }
  }
  return { result, found };
}

/* ------------------------------------------------------------------ */
/* 기능 개수 추정                                                         */
/* ------------------------------------------------------------------ */

const SCALE_USERS: Record<UserScale, number> = { s: 20, m: 60, l: 200, xl: 500 };
const VOLUME_GB: Record<DataVolume, number> = { low: 50, mid: 300, high: 1000, xl: 4000, xxl: 8000 };
/** 고객 수·매출 규모가 암시하는 최소 데이터 용량(GB, 3년) */
const CUSTOMER_GB: Record<CustomerScale, number> = { none: 0, c50: 50, c200: 150, c500: 400, c1000: 800, c2000: 1500, c2000p: 3000 };
const SALES_GB: Record<SalesScale, number> = { none: 0, s1000: 100, s5000: 300, s1t: 600, s5t: 2000, s10t: 4000 };

const AGG_W: Record<Aggregation, { ilf: number; ei: number; eo: number; perf: Level; prod: number }> = {
  none: { ilf: 0, ei: 0, eo: 0, perf: 1, prod: 0 },
  light: { ilf: 0, ei: 0, eo: 2, perf: 1, prod: 0 },
  heavy: { ilf: 2, ei: 2, eo: 6, perf: 3, prod: 3 },
  massive: { ilf: 3, ei: 3, eo: 10, perf: 4, prod: 5 },
};
const AUTO_W: Record<AutomationKey, { ilf: number; ei: number; eo: number; eq: number; perf: Level; prod: number }> = {
  batch: { ilf: 1, ei: 2, eo: 1, eq: 1, perf: 1, prod: 0 },
  event: { ilf: 2, ei: 4, eo: 2, eq: 1, perf: 4, prod: 2 },
  campaign: { ilf: 1, ei: 3, eo: 2, eq: 2, perf: 1, prod: 0 },
  rule: { ilf: 1, ei: 3, eo: 0, eq: 1, perf: 1, prod: 0 },
};

const labelOf = <T extends string>(opts: Option<T>[], v: T) => opts.find((o) => o.value === v)?.label ?? v;

export interface EasyConversion {
  input: EstimateInput;
  counts: FunctionCounts;
  assumptions: string[];
}

export function toEstimateInput(e: EasyInput): EasyConversion {
  const custom = e.customData
    .split(/[,，、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const hasHr = e.integrations.includes("hr");
  const ownedKinds = e.dataKinds.filter((k) => !(k === "person" && hasHr));
  const ownedLabels = [...ownedKinds.map((k) => labelOf(DATA_KIND_OPTIONS, k)), ...custom];
  const ownedCount = ownedLabels.length;
  const hasManager = e.userGroups.includes("manager");
  const hasExec = e.userGroups.includes("exec");
  const hasExternal = e.userGroups.includes("external");
  const hasCustomer = e.customerScale !== "none";
  const hasSales = e.salesScale !== "none";
  const assumptions: string[] = [];

  /* ---- 업무 데이터 (ILF) ---- */
  const ilfParts = ["사용자·권한", "공통코드", ...ownedLabels];
  if (hasCustomer) ilfParts.push("고객 마스터", "고객 동의·접촉 이력");
  if (hasSales) ilfParts.push("거래·매출 상세", "매출 집계 기준(기간·조직)");
  if (e.approval !== "none") ilfParts.push("결재 이력");
  if (e.attachments) ilfParts.push("첨부파일");
  if (e.notify !== "none") ilfParts.push("알림 이력");
  let ilf = ilfParts.length;
  ilf += AGG_W[e.aggregation].ilf;
  for (const a of e.automation) ilf += AUTO_W[a].ilf;
  const extraIlf = ilf - ilfParts.length;
  assumptions.push(`직접 관리하는 데이터 ${ilf}종: ${ilfParts.join(", ")}${extraIlf ? ` + 집계·자동화용 테이블 ${extraIlf}종` : ""}`);

  /* ---- 연계 (EIF / EI / EO) ---- */
  let eif = 0;
  let linkEi = 0;
  let linkEo = 0;
  const heavyLinks: string[] = [];
  for (const k of e.integrations) {
    const o = INTEGRATION_OPTIONS.find((x) => x.value === k);
    if (!o) continue;
    eif += o.w.eif;
    linkEi += o.w.ei;
    linkEo += o.w.eo;
    if (o.heavy) heavyLinks.push(o.label);
  }
  if (e.integrations.length)
    assumptions.push(
      `연계 ${e.integrations.length}개 (${e.integrations.map((k) => labelOf(INTEGRATION_OPTIONS, k)).join(", ")}) → 외부참조 데이터 ${eif}종, 송수신 기능 ${linkEi + linkEo}개${heavyLinks.length ? `. 특히 ${heavyLinks.join(", ")} — 인터페이스 설계·테스트 비중이 큰 연계` : ""}`,
    );

  /* ---- 입력·처리 (EI) ---- */
  const approvalEi: Record<Approval, number> = { none: 0, single: 3, multi: 5, conditional: 7 };
  let ei = ownedCount * 3 + approvalEi[e.approval] + linkEi;
  if (hasCustomer) ei += 2; // 고객 정보 수정·동의 관리
  if (hasSales) ei += 1; // 매출 데이터 보정·재처리
  if (e.attachments) ei += 2;
  if (hasManager) ei += 2;
  if (hasExternal) ei += 2;
  if (e.kind === "erp" || e.kind === "scm") ei += 3;
  if (e.kind === "fcm") ei += 2;
  if (e.kind === "campaign" || e.kind === "unified_membership") ei += 3;
  if (e.kind === "brand_membership") ei += 2;
  if (e.kind === "channel") ei += 4;
  ei += AGG_W[e.aggregation].ei;
  for (const a of e.automation) ei += AUTO_W[a].ei;
  assumptions.push(
    `입력·처리 기능 ${ei}개: 데이터 종류별 등록·수정·삭제${e.approval !== "none" ? `, ${labelOf(APPROVAL_OPTIONS, e.approval)} 결재` : ""}${hasCustomer ? ", 고객 정보·동의 관리" : ""}${e.attachments ? ", 파일 업로드" : ""}${e.automation.length ? `, ${e.automation.map((a) => labelOf(AUTOMATION_OPTIONS, a)).join("·")}` : ""}${linkEi ? `, 연계 수신 ${linkEi}개` : ""}`,
  );

  /* ---- 출력 (EO) ---- */
  const reportEo: Record<Report, number> = { none: 0, excel: 2, stats: 4, dashboard: 7 };
  const notifyEo: Record<Notify, number> = { none: 0, mail: 1, messenger: 1, both: 2 };
  let eo = reportEo[e.report] + notifyEo[e.notify] + linkEo;
  if (e.approval === "multi" || e.approval === "conditional") eo += 1;
  if (hasSales) eo += 2; // 매출 리포트 기본
  if (e.kind === "report") eo += 2;
  eo += AGG_W[e.aggregation].eo;
  for (const a of e.automation) eo += AUTO_W[a].eo;
  const eoParts = [labelOf(REPORT_OPTIONS, e.report), hasSales ? "매출 리포트" : "", e.aggregation !== "none" ? `${labelOf(AGGREGATION_OPTIONS, e.aggregation)} 수준 집계 ${AGG_W[e.aggregation].eo}개` : "", e.notify !== "none" ? `${labelOf(NOTIFY_OPTIONS, e.notify)} 알림` : "", linkEo ? `연계 송신·고객 발송 ${linkEo}개` : ""].filter((s) => s && s !== "없음");
  if (eo) assumptions.push(`리포트·집계·발송 ${eo}개: ${eoParts.join(", ")}`);

  /* ---- 조회 (EQ) ---- */
  let eq = ownedCount * 2;
  if (hasCustomer) eq += 2; // 고객 검색·360 조회
  if (hasSales) eq += 1;
  if (e.approval !== "none") eq += 2;
  eq += Math.max(0, e.userGroups.length - 1);
  if (hasExec) eq += 1;
  if (e.attachments) eq += 1;
  if (eif) eq += 1;
  if (e.kind === "erp" || e.kind === "scm" || e.kind === "fcm") eq += 2;
  if (e.kind === "campaign" || e.kind === "brand_membership" || e.kind === "unified_membership") eq += 2;
  if (e.kind === "channel") eq += 2;
  for (const a of e.automation) eq += AUTO_W[a].eq;
  assumptions.push(`조회 화면 ${eq}개: 데이터 종류별 목록·상세${hasCustomer ? ", 고객 검색·고객별 이력" : ""}${e.approval !== "none" ? ", 결재함" : ""}${e.automation.length ? ", 자동 처리 이력·성과" : ""}${e.userGroups.length > 1 ? `, 역할별 메뉴 ${e.userGroups.length}종` : ""}`);

  const counts: FunctionCounts = { ilf, eif, ei, eo, eq };

  /* ---- 환경·보정 ---- */
  const concurrentUsers = SCALE_USERS[e.userScale];
  let dataGb = Math.max(VOLUME_GB[e.dataVolume], CUSTOMER_GB[e.customerScale], SALES_GB[e.salesScale]);
  if (e.attachments) dataGb = Math.round(dataGb * 1.5);
  const volParts = [labelOf(VOLUME_OPTIONS, e.dataVolume)];
  if (hasCustomer) volParts.push(`고객 ${labelOf(CUSTOMER_OPTIONS, e.customerScale)}`);
  if (hasSales) volParts.push(`매출 ${labelOf(SALES_OPTIONS, e.salesScale)}`);
  assumptions.push(`사용자 ${labelOf(SCALE_OPTIONS, e.userScale)} → 동시 접속 약 ${concurrentUsers}명. 데이터 ${volParts.join(" · ")} → 약 ${dataGb >= 1000 ? `${(dataGb / 1000).toFixed(1)}TB` : `${dataGb}GB`}(3년)${e.attachments ? ", 첨부 포함" : ""}`);

  let perfLevel: Level = e.speed === "fast" ? 3 : 1;
  perfLevel = Math.max(perfLevel, AGG_W[e.aggregation].perf) as Level;
  for (const a of e.automation) perfLevel = Math.max(perfLevel, AUTO_W[a].perf) as Level;
  if (e.speed === "fast" && perfLevel >= 3) perfLevel = Math.min(5, perfLevel + 1) as Level;
  if (perfLevel > 1) assumptions.push(`성능 요구 ${perfLevel}단계: ${e.speed === "fast" ? "빠른 응답 필수" : ""}${e.aggregation === "heavy" || e.aggregation === "massive" ? " · 대량 집계" : ""}${e.automation.includes("event") ? " · 실시간 이벤트 처리" : ""}`.replace(": ·", ":"));

  let secLevel: Level = 1;
  if (hasCustomer) secLevel = 2;
  if (hasCustomer && hasExternal) secLevel = 3;
  if (hasCustomer) assumptions.push(`고객 정보 포함 → 보안 요구 ${secLevel}단계(개인정보보호 + 암호화${hasExternal ? " + 웹취약점 점검" : ""}). DB 암호화·접근제어 솔루션, 망분리 등 개인정보 보호 인프라 비용은 별도`);
  else if (hasExternal) secLevel = 2;

  let productivity = DEFAULT_INPUT.productivity - AGG_W[e.aggregation].prod;
  for (const a of e.automation) productivity -= AUTO_W[a].prod;
  productivity = Math.max(12, productivity);
  if (productivity < DEFAULT_INPUT.productivity) assumptions.push(`대량 집계·실시간 처리는 설계·튜닝 비중이 커서 생산성 가정을 ${DEFAULT_INPUT.productivity} → ${productivity} FP/M/M으로 낮춤`);
  if (e.mobile) assumptions.push("PC + 모바일 반응형 → UI 작업 비중 상향");

  const input: EstimateInput = {
    ...DEFAULT_INPUT,
    title: e.title,
    description: e.description,
    mode: "detail",
    counts,
    externalLinks: e.integrations.length,
    perfLevel,
    envLevel: 2,
    secLevel,
    mobile: e.mobile,
    concurrentUsers,
    dataGb,
    productivity,
    inputCoverage: e.coverage,
  };

  if (e.coverage < 1) {
    assumptions.push(
      `입력 기능을 전체의 ${Math.round(e.coverage * 100)}%로 보고 ${(1 / e.coverage).toFixed(2)}배로 보정합니다. 기본은 큰 그림 60%이고, 주요 기능까지 적었으면 70%입니다. 결과 화면에서 바꿀 수 있습니다.`,
    );
  } else {
    assumptions.push("입력한 기능을 전체의 100%로 보고 보정하지 않았습니다.");
  }

  return { input, counts, assumptions };
}
