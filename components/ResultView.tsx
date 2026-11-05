"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Cloud, Copy, Info, Landmark, Printer, RotateCcw, Store, Users, MessageSquareText } from "lucide-react";
import {
  ENV_LABELS,
  FP_UNIT_PRICE,
  KOSA_WAGE,
  MARKET_GRADE,
  MARKET_GRADE_SAP,
  PERF_LABELS,
  RATE_YEAR,
  SEC_LABELS,
  estimate,
  fmtKRW,
  fmtNum,
  fmtPct,
  linkLabel,
  type EstimateInput,
  type EstimateResult,
  type Stack,
} from "@/lib/estimate";
import type { SurveyMilestone, UsageChannel } from "@/lib/usage";
import { Card, Field, NumberInput, Stat } from "./ui";
import SourcesPanel from "./SourcesPanel";
import SurveyModal from "./SurveyModal";

export function buildSummary(input: EstimateInput, r: EstimateResult, assumptions?: string[]): string {
  const lines = [
    `[시스템별 구축견적 산정] ${input.title || "(이름 없음)"}`,
    input.description ? `설명: ${input.description}` : "",
    `기술 스택: ${r.stack === "sap" ? "SAP ABAP + HANA" : "Java(Spring) + PostgreSQL"} (${r.productivity} FP/M/M), ${input.mobile ? "PC+모바일" : "PC 웹"}`,
    r.inputCoverage < 1
      ? `입력 커버리지: ${Math.round(r.inputCoverage * 100)}% → 기능점수 ${fmtNum(r.rawFp)} FP를 ${fmtNum(r.fp)} FP로 보정`
      : `기능점수: ${fmtNum(r.fp)} FP (보정 없음, 입력=전체 100%)`,
    `기능점수: ${fmtNum(r.fp)} FP (ILF ${r.counts.ilf} / EIF ${r.counts.eif} / EI ${r.counts.ei} / EO ${r.counts.eo} / EQ ${r.counts.eq})`,
    `예상 공수: ${fmtNum(r.effort.totalMM)} M/M, 약 ${r.schedule.months}개월 · 평균 ${r.schedule.headcount}명`,
    "",
    `① 공공 표준 (SW사업 대가산정 가이드, FP ${FP_UNIT_PRICE.toLocaleString()}원): ${fmtKRW(r.fpMethod.total)} (이윤 ${fmtPct(input.profitRate)} 포함)`,
    `② KOSA ${RATE_YEAR}년 SW기술자 평균임금 × 공수: 원가(마진 없음) ${fmtKRW(r.kosa.direct)} / 제경비·기술료 포함 ${fmtKRW(r.kosa.publicTotal)}`,
    `③ 민간 SI 시세 × 공수: ${fmtKRW(r.market.quoteLow)} ~ ${fmtKRW(r.market.quoteHigh)} (수행사 관리비·이윤 ${fmtPct(input.vendorOverhead)} 포함)`,
    `→ 합리적 범위: ${fmtKRW(r.rangeLow)} ~ ${fmtKRW(r.rangeHigh)}`,
    input.affiliateQuote > 0 ? `계열사 제안가: ${fmtKRW(input.affiliateQuote)} (공공 표준 대비 ${fmtPct(1 - input.affiliateQuote / r.fpMethod.total)} 절감)` : "",
    "",
    `클라우드 인프라(별도, 개인정보 미포함 가정): 월 ${fmtKRW(r.infra.monthlyLow)} ~ ${fmtKRW(r.infra.monthlyHigh)} (${r.infra.tier}형)`,
    `연간 유지보수 참고치: ${fmtKRW(r.maintenanceYearLow)} ~ ${fmtKRW(r.maintenanceYearHigh)} (구축비의 12~15%)`,
    "",
    ...(assumptions && assumptions.length ? ["[산정 전제]", ...assumptions.map((a) => `- ${a}`), ""] : []),
    "* 모든 금액은 부가세 별도이며, 보안 솔루션·인프라 구축비·라이선스는 제외한 개발 공수 기준입니다.",
  ];
  return lines.join("\n");
}

interface Props {
  input: EstimateInput;
  setInput: (p: Partial<EstimateInput>) => void;
  onBack: () => void;
  onReset: () => void;
  /** 현업 모드에서 넘어온 산정 전제 (있으면 상단에 표시) */
  assumptions?: string[];
  backLabel?: string;
  /** 사용량 집계 채널. 없으면 기록하지 않음 */
  channel?: UsageChannel;
}

export default function ResultView({ input, setInput, onBack, onReset, assumptions, backLabel = "입력 수정", channel }: Props) {
  const rJava = useMemo(() => estimate({ ...input, stack: "java" }), [input]);
  const rSap = useMemo(() => estimate({ ...input, stack: "sap" }), [input]);
  const r = (input.stack ?? "java") === "sap" ? rSap : rJava;
  const [copied, setCopied] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [survey, setSurvey] = useState<{ milestone: SurveyMilestone; count: number } | null>(null);
  const grades = r.stack === "sap" ? MARKET_GRADE_SAP : MARKET_GRADE;

  useEffect(() => {
    if (!channel) return;
    const key = `usage:${channel}:${input.title || ""}:${Math.round(r.fp)}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    void fetch("/api/usage/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        stack: r.stack,
        title: input.title || "",
        fp: r.fp,
      }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number; pendingSurvey?: SurveyMilestone | null };
        if (!data.pendingSurvey || typeof data.count !== "number") return;
        try {
          const skip = sessionStorage.getItem(`survey-skip:${data.pendingSurvey}`);
          if (skip) return;
        } catch {
          /* private mode */
        }
        setSurvey({ milestone: data.pendingSurvey, count: data.count });
      })
      .catch(() => {
        /* 집계 실패해도 산정 화면은 유지 */
      });
  }, [channel, input.title, r.fp, r.stack]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildSummary(input, r, assumptions));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 미지원 환경 */
    }
  };

  const saving = input.affiliateQuote > 0 ? 1 - input.affiliateQuote / r.fpMethod.total : null;
  const savingVsMarketMid = input.affiliateQuote > 0 ? 1 - input.affiliateQuote / r.market.quoteMid : null;

  return (
    <div className="space-y-6">
      {survey && (
        <SurveyModal
          milestone={survey.milestone}
          count={survey.count}
          onClose={() => {
            try {
              sessionStorage.setItem(`survey-skip:${survey.milestone}`, "1");
            } catch {
              /* private mode */
            }
            setSurvey(null);
          }}
          onSubmitted={() => setSurvey(null)}
        />
      )}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">산정 대상</div>
            <h2 className="text-lg font-semibold">{input.title || "(이름 없음)"}</h2>
            {input.description && <p className="mt-1 text-sm text-muted-foreground">{input.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs text-muted-foreground">구현 스택</span>
              {(["java", "sap"] as Stack[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput({ stack: s })}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    r.stack === s ? "border-accent bg-blue-50 text-accent" : "border-border bg-white hover:border-accent/50"
                  }`}
                >
                  {s === "java" ? "Java + PostgreSQL (기본)" : "SAP ABAP + HANA"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              같은 기능점수 {fmtNum(rJava.fp)} FP 기준. SAP는 생산성 {rJava.productivity}→{rSap.productivity} FP/M/M, 공수 {fmtNum(rJava.effort.totalMM)}→
              {fmtNum(rSap.effort.totalMM)} M/M, 시장 중간값 {fmtKRW(rJava.market.quoteMid)}→{fmtKRW(rSap.market.quoteMid)}. 공공 표준(①)은 스택과 무관합니다.
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "복사됨" : "요약 복사"}
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted">
              <Printer className="h-4 w-4" /> 인쇄
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="기능점수"
            value={`${fmtNum(r.fp)} FP`}
            sub={
              r.inputCoverage < 1
                ? `입력 ${fmtNum(r.rawFp)} FP → ${Math.round(r.inputCoverage * 100)}% 가정으로 보정`
                : `ILF ${r.counts.ilf} · EIF ${r.counts.eif} · EI ${r.counts.ei} · EO ${r.counts.eo} · EQ ${r.counts.eq}`
            }
          />
          <Stat label="예상 공수" value={`${fmtNum(r.effort.totalMM)} M/M`} sub={`생산성 ${r.productivity} FP/M/M 가정`} />
          <Stat label="예상 기간·인원" value={`${r.schedule.months}개월`} sub={`평균 ${r.schedule.headcount}명 투입`} />
          <Stat label="합리적 구축비 범위" value={`${fmtKRW(r.rangeLow)} ~`} sub={fmtKRW(r.rangeHigh)} highlight />
        </div>
      </Card>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">입력 커버리지 · 적어 주신 기능이 전체의 {Math.round(r.inputCoverage * 100)}%</p>
        <p className="mt-1 text-amber-900">
          {r.inputCoverage < 1
            ? `큰 그림 기본은 60%, 주요 기능까지 적었으면 70%입니다. 입력 ${fmtNum(r.rawFp)} FP를 ${(1 / r.inputCoverage).toFixed(2)}배 하여 ${fmtNum(r.fp)} FP로 산정했습니다.`
            : `입력한 기능을 전체의 100%로 보고 보정하지 않았습니다. (${fmtNum(r.fp)} FP)`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { v: 1, t: "보정 없음(100%)" },
            { v: 0.9, t: "90%" },
            { v: 0.7, t: "70%" },
            { v: 0.6, t: "60% (큰 그림 · 기본)" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setInput({ inputCoverage: o.v })}
              className={`rounded-md border px-3 py-1 text-xs ${Math.abs(r.inputCoverage - o.v) < 0.001 ? "border-amber-700 bg-amber-200 font-semibold" : "border-amber-300 bg-white"}`}
            >
              {o.t}
            </button>
          ))}
        </div>
      </div>

      <SourcesPanel />

      {assumptions && assumptions.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText className="h-4 w-4 text-accent" /> 답변을 이렇게 해석해서 산정했습니다
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">실제 요구사항 정의 때 기능 수가 달라지면 결과도 달라집니다. 이 산정은 예산 규모를 가늠하는 용도입니다.</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="h-4 w-4 text-accent" /> ① 공공 표준 (기능점수 간이법)
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">KOSA 가이드 · 공식</span>
          </div>
          <div className="mt-3 text-2xl font-semibold tabular-nums">{fmtKRW(r.fpMethod.total)}</div>
          <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between"><dt>보정 전 개발원가</dt><dd className="tabular-nums">{fmtKRW(r.fpMethod.baseCost)}</dd></div>
            <div className="flex justify-between"><dt>보정계수 (합산)</dt><dd className="tabular-nums">× {r.fpMethod.factor.toFixed(3)}</dd></div>
            <div className="flex justify-between"><dt>개발원가</dt><dd className="tabular-nums">{fmtKRW(r.fpMethod.devCost)}</dd></div>
            <div className="flex justify-between"><dt>이윤 ({fmtPct(input.profitRate)})</dt><dd className="tabular-nums">{fmtKRW(r.fpMethod.profit)}</dd></div>
          </dl>
          <p className="mt-auto pt-3 text-xs text-muted-foreground">
            SW사업 대가산정 가이드(KOSA) FP당 {FP_UNIT_PRICE.toLocaleString()}원. 공공기관 발주 예정가격의 기준이며 민간에서는 상한 성격으로 쓰입니다.
          </p>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-accent" /> ② {RATE_YEAR}년 SW기술자 평균임금 × 공수
            </div>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">통계승인 제375001호</span>
          </div>
          <div className="mt-3 text-2xl font-semibold tabular-nums">{fmtKRW(r.kosa.direct)}</div>
          <div className="text-xs font-medium text-foreground">원가 · 마진 없음</div>
          <div className="text-xs text-muted-foreground">KOSA 공표 월평균임금 × 공수. 이윤을 넣지 않은 직접인건비입니다.</div>
          <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between"><dt>+ 제경비 (140%)</dt><dd className="tabular-nums">{fmtKRW(r.kosa.overhead)}</dd></div>
            <div className="flex justify-between"><dt>+ 기술료 (20%)</dt><dd className="tabular-nums">{fmtKRW(r.kosa.techFee)}</dd></div>
            <div className="flex justify-between font-medium text-foreground"><dt>공공 투입공수 방식 합계</dt><dd className="tabular-nums">{fmtKRW(r.kosa.publicTotal)}</dd></div>
          </dl>
          <p className="mt-auto pt-3 text-xs text-muted-foreground">
            KOSA 공표 통계(통계승인 제375001호)는 견적가가 아니라 임금입니다. 위 금액은 그 임금 × 공수라 마진이 없습니다. 제경비는 간접비, 기술료 20%는 공공 투입공수 산식의 가산이라 위 금액에 들어 있지 않습니다.
          </p>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Store className="h-4 w-4 text-accent" /> ③ 민간 SI 시세 × 공수
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{r.stack === "sap" ? "SAP 시장 참고치" : "시장 참고치"}</span>
          </div>
          <div className="mt-3 text-2xl font-semibold tabular-nums">
            {fmtKRW(r.market.quoteLow)} <span className="text-base text-muted-foreground">~</span> {fmtKRW(r.market.quoteHigh)}
          </div>
          <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between"><dt>등급별 인건비 (하한~상한)</dt><dd className="tabular-nums">{fmtKRW(r.market.laborLow)} ~ {fmtKRW(r.market.laborHigh)}</dd></div>
            <div className="flex justify-between"><dt>수행사 관리비·이윤</dt><dd className="tabular-nums">+ {fmtPct(input.vendorOverhead)}</dd></div>
            <div className="flex justify-between font-medium text-foreground"><dt>중간값</dt><dd className="tabular-nums">{fmtKRW(r.market.quoteMid)}</dd></div>
          </dl>
          <p className="mt-auto pt-3 text-xs text-muted-foreground">
            {r.stack === "sap"
              ? `${RATE_YEAR}년 국내 SAP 컨설턴트 등급 단가 참고치(중급 ${grades.중급.low / 10000}~${grades.중급.high / 10000}만 · 고급 ${grades.고급.low / 10000}~${grades.고급.high / 10000}만 · 특급 ${grades.특급.low / 10000}~${grades.특급.high / 10000}만 원/월). 공식 통계가 아닙니다.`
              : `${RATE_YEAR}년 국내 SI 외주 등급 단가(초급 ${grades.초급.low / 10000}~${grades.초급.high / 10000}만 · 중급 ${grades.중급.low / 10000}~${grades.중급.high / 10000}만 · 고급 ${grades.고급.low / 10000}~${grades.고급.high / 10000}만 · 특급 ${grades.특급.low / 10000}~${grades.특급.high / 10000}만 원/월). 실제 외주 견적이 형성되는 구간입니다.`}
          </p>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold">계열사 제안가와 비교</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_2fr]">
          <Field label="계열사(IT 자회사) 제안가 (원, VAT 별도)" hint="견적 금액을 입력하면 절감률을 계산합니다.">
            <NumberInput value={input.affiliateQuote} step={1_000_000} onChange={(v) => setInput({ affiliateQuote: v })} />
          </Field>
          {saving !== null && savingVsMarketMid !== null ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="제안가" value={fmtKRW(input.affiliateQuote)} />
              <Stat label="공공 표준 대비" value={fmtPct(saving)} sub={saving >= 0 ? "절감" : "초과"} highlight={saving >= 0} />
              <Stat label="시장 중간값 대비" value={fmtPct(savingVsMarketMid)} sub={savingVsMarketMid >= 0 ? "절감" : "초과"} highlight={savingVsMarketMid >= 0} />
            </div>
          ) : (
            <div className="flex items-center text-sm text-muted-foreground">제안가를 입력하면 공공 표준·시장 중간값 대비 절감률이 표시됩니다.</div>
          )}
        </div>
        <PositionBar r={r} quote={input.affiliateQuote} />
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Cloud className="h-4 w-4 text-accent" /> 클라우드 인프라 예상 (별도 비용, 개발비 미포함)
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_2fr]">
          <Stat label={`${r.infra.tier}형 구성 · 월 비용`} value={`${fmtKRW(r.infra.monthlyLow)} ~ ${fmtKRW(r.infra.monthlyHigh)}`} sub={`연간 ${fmtKRW(r.infra.monthlyLow * 12)} ~ ${fmtKRW(r.infra.monthlyHigh * 12)}`} />
          <div className="text-sm">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {r.infra.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {r.infra.note}{" "}
              {r.stack === "sap"
                ? "SAP 라이선스·AMS는 포함하지 않은 운영비 참고치입니다."
                : "국내 리전(네이버클라우드·KT클라우드·AWS 서울) 정가 기준의 대략치입니다."}{" "}
              {input.secLevel >= 2
                ? "고객(개인)정보를 다루므로 DB 암호화·접근제어·개인정보 보호 솔루션, 망분리 등이 추가로 필요하며 이 금액에는 포함되지 않았습니다."
                : "개인정보를 다루지 않는다는 가정으로 망분리·DB 암호화·개인정보 보안 솔루션은 제외했습니다."}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <button type="button" onClick={() => setShowDetail((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">
          <span className="inline-flex items-center gap-2"><Info className="h-4 w-4 text-accent" /> 산정 근거 상세 (기능점수 · 보정계수 · 역할별 공수)</span>
          <span className="text-xs text-muted-foreground">{showDetail ? "접기" : "펼치기"}</span>
        </button>
        {showDetail && (
          <div className="mt-4 space-y-6 text-sm">
            <div>
              <h4 className="font-medium">기능점수 집계 (간이법)</h4>
              <table className="mt-2 w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5">기능 유형</th><th className="py-1.5 text-right">개수</th><th className="py-1.5 text-right">가중치</th><th className="py-1.5 text-right">FP</th>
                  </tr>
                </thead>
                <tbody>
                  {r.fpResult.rows.map((row) => (
                    <tr key={row.key} className="border-b border-border/50">
                      <td className="py-1.5">{row.label}</td><td className="py-1.5 text-right tabular-nums">{row.count}</td><td className="py-1.5 text-right tabular-nums">{row.weight}</td><td className="py-1.5 text-right tabular-nums">{fmtNum(row.fp)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium"><td className="py-1.5">합계</td><td /><td /><td className="py-1.5 text-right tabular-nums">{fmtNum(r.fp)}</td></tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-medium">보정계수</h4>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  <tr className="border-b border-border/50"><td className="py-1.5">규모 ({fmtNum(r.fp)} FP)</td><td className="py-1.5 text-muted-foreground">{r.fp < 500 ? "500FP 미만 고정" : r.fp > 3000 ? "3,000FP 초과 고정" : "0.4057×(ln FP − 7.1978)² + 0.8878"}</td><td className="py-1.5 text-right tabular-nums">{r.fpMethod.factors.size.toFixed(4)}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5">연계복잡성</td><td className="py-1.5 text-muted-foreground">{linkLabel(input.externalLinks)}</td><td className="py-1.5 text-right tabular-nums">{r.fpMethod.factors.link.toFixed(2)}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5">성능</td><td className="py-1.5 text-muted-foreground">{input.perfLevel}단계 · {PERF_LABELS[input.perfLevel - 1]}</td><td className="py-1.5 text-right tabular-nums">{r.fpMethod.factors.perf.toFixed(2)}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5">운영환경 호환성</td><td className="py-1.5 text-muted-foreground">{input.envLevel}단계 · {ENV_LABELS[input.envLevel - 1]}</td><td className="py-1.5 text-right tabular-nums">{r.fpMethod.factors.env.toFixed(2)}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5">보안성</td><td className="py-1.5 text-muted-foreground">{input.secLevel}단계 · {SEC_LABELS[input.secLevel - 1]}</td><td className="py-1.5 text-right tabular-nums">{r.fpMethod.factors.sec.toFixed(2)}</td></tr>
                  <tr className="font-medium"><td className="py-1.5">곱</td><td /><td className="py-1.5 text-right tabular-nums">{r.fpMethod.factor.toFixed(4)}</td></tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-medium">역할별 공수와 단가</h4>
              <table className="mt-2 w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5">역할</th><th className="py-1.5 text-right">M/M</th><th className="py-1.5 text-right">KOSA 월평균임금</th><th className="py-1.5 text-right">KOSA 인건비</th><th className="py-1.5">시장 등급</th><th className="py-1.5 text-right">시장 인건비</th>
                  </tr>
                </thead>
                <tbody>
                  {r.effort.rows.map((row) => (
                    <tr key={row.key} className="border-b border-border/50">
                      <td className="py-1.5">{row.label}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtNum(row.mm, 2)}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.kosaMonthly.toLocaleString()}원</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtKRW(row.kosaCost)}</td>
                      <td className="py-1.5">{row.gradeText}</td>
                      <td className="py-1.5 text-right tabular-nums">{fmtKRW(row.marketLow)} ~ {fmtKRW(row.marketHigh)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-1.5">합계</td><td className="py-1.5 text-right tabular-nums">{fmtNum(r.effort.totalMM, 2)}</td><td /><td className="py-1.5 text-right tabular-nums">{fmtKRW(r.effort.kosaDirect)}</td><td /><td className="py-1.5 text-right tabular-nums">{fmtKRW(r.effort.marketLow)} ~ {fmtKRW(r.effort.marketHigh)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                KOSA 월평균임금 출처: {RATE_YEAR}년 적용 SW기술자 평균임금 — {Object.values(KOSA_WAGE).map((w) => `${w.label} ${w.monthly.toLocaleString()}원`).join(", ")}.
              </p>
            </div>

            <div>
              <h4 className="font-medium">산정 파라미터 (조정 가능)</h4>
              <div className="mt-2 grid gap-4 md:grid-cols-3">
                <Field label="생산성 (FP / M/M)" hint="Java 웹 SI 평균 15~25. 숙련 조직일수록 높음">
                  <NumberInput value={input.productivity} min={1} onChange={(v) => setInput({ productivity: v })} />
                </Field>
                <Field label="이윤율 (공공 표준, 0~25%)" hint="가이드 상 개발원가의 25% 이내">
                  <NumberInput value={Math.round(input.profitRate * 100)} min={0} onChange={(v) => setInput({ profitRate: Math.min(25, Math.max(0, v)) / 100 })} />
                </Field>
                <Field label="민간 수행사 관리비·이윤 (%)" hint="인건비 외 PM 간접비·이윤. 통상 15~30%">
                  <NumberInput value={Math.round(input.vendorOverhead * 100)} min={0} onChange={(v) => setInput({ vendorOverhead: Math.max(0, v) / 100 })} />
                </Field>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground">읽는 법과 한계</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>모든 금액은 부가세 별도, 보안 솔루션·인프라 구축·상용 라이선스·데이터 이관 비용은 제외한 <b>순수 개발 공수</b>입니다.</li>
          <li>①은 공공기관 예정가격 산식이라 민간 외주보다 높게 나오는 것이 정상입니다. 계열사 제안가가 ①보다 낮고 ③ 범위 안에 있으면 시장 대비 합리적이라고 설명할 수 있습니다.</li>
          <li>②의 큰 금액은 KOSA 공표 임금 × 공수입니다. 원가이고 마진이 없습니다. 프리랜서 수령액(③)과 기준이 다르므로 함께 보는 참고치입니다.</li>
          <li>기능 수를 요구사항 정의 단계에서 다시 세면 결과가 ±30% 이상 달라질 수 있습니다.</li>
          <li>연간 유지보수 참고치: 구축비의 12~15% → {fmtKRW(r.maintenanceYearLow)} ~ {fmtKRW(r.maintenanceYearHigh)}.</li>
        </ul>
      </Card>

      <div className="flex justify-between print:hidden">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
          <RotateCcw className="h-4 w-4" /> 처음부터
        </button>
      </div>
    </div>
  );
}

function PositionBar({ r, quote }: { r: EstimateResult; quote: number }) {
  const values = [r.market.quoteLow, r.market.quoteHigh, r.kosa.direct, r.fpMethod.total, quote > 0 ? quote : 0].filter((v) => v > 0);
  const max = Math.max(...values) * 1.1;
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const marks = [
    { label: "시장 하한", v: r.market.quoteLow, cls: "bg-muted-foreground" },
    { label: "KOSA 인건비", v: r.kosa.direct, cls: "bg-muted-foreground" },
    { label: "시장 상한", v: r.market.quoteHigh, cls: "bg-muted-foreground" },
    { label: "공공 표준", v: r.fpMethod.total, cls: "bg-foreground" },
  ];
  return (
    <div className="mt-6">
      <div className="relative h-2 rounded-full bg-muted">
        <div className="absolute h-2 rounded-full bg-accent/40" style={{ left: pos(r.market.quoteLow), width: `calc(${pos(r.market.quoteHigh)} - ${pos(r.market.quoteLow)})` }} />
        {marks.map((m) => (
          <div key={m.label} className={`absolute top-1/2 h-4 w-0.5 -translate-y-1/2 ${m.cls}`} style={{ left: pos(m.v) }} title={`${m.label} ${fmtKRW(m.v)}`} />
        ))}
        {quote > 0 && <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-accent" style={{ left: pos(quote) }} title={`계열사 제안가 ${fmtKRW(quote)}`} />}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {marks.map((m) => (
          <span key={m.label}>
            <span className={`mr-1 inline-block h-2 w-2 rounded-sm align-middle ${m.cls}`} />
            {m.label} {fmtKRW(m.v)}
          </span>
        ))}
        {quote > 0 && (
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
            계열사 제안가 {fmtKRW(quote)}
          </span>
        )}
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-accent/40 align-middle" />민간 시장 견적 구간</span>
      </div>
    </div>
  );
}
