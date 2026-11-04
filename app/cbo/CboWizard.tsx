"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, Home, Lightbulb } from "lucide-react";
import { type EstimateInput, calcFunctionPoints, fmtNum } from "@/lib/estimate";
import {
  COMPLEXITY_OPTIONS,
  COVERAGE_OPTIONS,
  DEFAULT_CBO,
  KIND_OPTIONS,
  KIND_PRESETS,
  MODULE_OPTIONS,
  toEstimateInput,
  type CboComplexity,
  type CboInput,
  type CboKind,
  type CboModule,
  type Coverage,
} from "@/lib/cbo";
import { Card, Chip, Question, inputCls } from "@/components/ui";
import ResultView from "@/components/ResultView";
import AppShell from "@/components/AppShell";

const SAMPLE_TITLES = KIND_OPTIONS.map((k) => k.title).filter(Boolean);
const SAMPLE_DESCS = KIND_OPTIONS.map((k) => k.desc).filter(Boolean);

export default function CboWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cbo, setCboState] = useState<CboInput>(DEFAULT_CBO);
  const [overrides, setOverrides] = useState<Partial<EstimateInput>>({});
  const setCbo = (p: Partial<CboInput>) => setCboState((prev) => ({ ...prev, ...p }));

  const conversion = useMemo(() => toEstimateInput(cbo), [cbo]);
  const input: EstimateInput = { ...conversion.input, ...overrides, stack: "sap" };
  const preview = useMemo(() => {
    const c = toEstimateInput(cbo);
    return { counts: c.counts, fp: calcFunctionPoints(c.counts).total };
  }, [cbo]);

  const pickKind = (k: CboKind, forceFill = false) => {
    const opt = KIND_OPTIONS.find((x) => x.value === k);
    if (!opt) return;
    const fillTitle = forceFill || !cbo.title.trim() || SAMPLE_TITLES.includes(cbo.title);
    const fillDesc = forceFill || !cbo.description.trim() || SAMPLE_DESCS.includes(cbo.description);
    setCbo({
      kind: k,
      ...KIND_PRESETS[k],
      ...(fillTitle ? { title: opt.title } : {}),
      ...(fillDesc ? { description: opt.desc } : {}),
    });
  };

  const pickModule = (m: CboModule) => setCbo({ module: m });
  const selected = KIND_OPTIONS.find((k) => k.value === cbo.kind);
  const canNext = cbo.module !== "" && (cbo.kind !== "" || cbo.description.trim().length > 0);
  const steps = ["1. 범위", "2. 규모", "3. 결과"];

  return (
    <AppShell>
      <header className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                {i > 0 && <span>›</span>}
                <span className={step === i + 1 ? "font-medium text-accent" : ""}>{s}</span>
              </span>
            ))}
          </div>
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground print:hidden">
            <Home className="h-3.5 w-3.5" /> 처음 화면
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-bold">SAP CBO 추가개발 공수 산정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          이미 돌아가는 ERP·SCM·FCM 위에 리포트·화면·연계·Enhancement·배치를 붙일 때 씁니다. IT·개발이 입력하는 전제라 입력 커버리지는 기본 보정 없음(100%)이고, 산정 스택은 SAP ABAP + HANA입니다.
        </p>
      </header>

      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold">1. 어느 SAP 영역인가요?</h2>
            <p className="mt-1 text-sm text-muted-foreground">회사 표준 모듈 기준으로 고르세요.</p>
            <div className="choice-grid mt-4">
              {MODULE_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => pickModule(m.value)}
                  className={`rounded-lg border p-4 text-left transition ${cbo.module === m.value ? "border-accent bg-blue-50" : "border-border bg-white hover:border-accent/50"}`}
                >
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">예: {m.example}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold">2. CBO 유형을 고르세요</h2>
            <p className="mt-1 text-sm text-muted-foreground">유형을 고르면 이름·설명이 채워집니다. 여러 종류를 한 요청에 넣으면 설명에 나열하세요.</p>
            <div className="choice-grid mt-4">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => pickKind(k.value)}
                  className={`rounded-lg border p-4 text-left transition ${cbo.kind === k.value ? "border-accent bg-blue-50" : "border-border bg-white hover:border-accent/50"}`}
                >
                  <div className="text-sm font-medium">{k.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">예: {k.example}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => { pickModule("scm"); pickKind("report", true); }}>
                <Lightbulb className="h-3.5 w-3.5" /> SCM 리포트 예시
              </button>
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => { pickModule("erp"); pickKind("enhancement", true); }}>
                <Lightbulb className="h-3.5 w-3.5" /> ERP BADI 예시
              </button>
              <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => { pickModule("fcm"); pickKind("batch", true); }}>
                <Lightbulb className="h-3.5 w-3.5" /> FCM 배치 예시
              </button>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold">3. 요청 이름과 추가 설명</h2>
            <div className="mt-4 grid gap-4">
              <input
                className={inputCls}
                value={cbo.title}
                placeholder={selected?.title || "예: 구매오더 단가 검증 BADI"}
                onChange={(e) => setCbo({ title: e.target.value })}
              />
              <textarea
                className={`${inputCls} min-h-[120px]`}
                value={cbo.description}
                placeholder={selected?.desc || "대상 모듈, 화면/리포트 수, 연계 시스템, 복잡도 단서를 적어 주세요."}
                onChange={(e) => setCbo({ description: e.target.value })}
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <button type="button" disabled={!canNext} onClick={() => setStep(2)} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
              다음: 규모 잡기 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Card className="space-y-5">
            <Question no={1} title="이번 요청에 CBO·오브젝트가 대략 몇 개인가요?" hint="프로그램·Enhancement·인터페이스 단위로 세세요. 1~30.">
              <input
                type="number"
                min={1}
                max={30}
                className={`${inputCls} max-w-[8rem]`}
                value={cbo.objectCount}
                onChange={(e) => setCbo({ objectCount: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
              />
            </Question>

            <Question no={2} title="복잡도는요?">
              <div className="grid gap-2 sm:grid-cols-3">
                {COMPLEXITY_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    desc={o.desc}
                    selected={cbo.complexity === o.value}
                    onClick={() => setCbo({ complexity: o.value as CboComplexity })}
                  />
                ))}
              </div>
            </Question>

            <Question no={3} title="외부 연계(IDoc·RFC·API)가 포함되나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="없음" selected={!cbo.hasInterface} onClick={() => setCbo({ hasInterface: false })} />
                <Chip label="있음" desc="매핑·재처리·모니터링" selected={cbo.hasInterface} onClick={() => setCbo({ hasInterface: true })} />
              </div>
            </Question>

            <Question no={4} title="권한·조직(플랜트·회사코드) 체크가 있나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="간단·거의 없음" selected={!cbo.hasAuth} onClick={() => setCbo({ hasAuth: false })} />
                <Chip label="있음" selected={cbo.hasAuth} onClick={() => setCbo({ hasAuth: true })} />
              </div>
            </Question>

            <Question no={5} title="배치·정기 잡이 포함되나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="없음" selected={!cbo.hasBatch} onClick={() => setCbo({ hasBatch: false })} />
                <Chip label="있음" selected={cbo.hasBatch} onClick={() => setCbo({ hasBatch: true })} />
              </div>
            </Question>

            <Question no={6} title="현장·모바일에서도 쓰나요?">
              <div className="grid gap-2 sm:grid-cols-2">
                <Chip label="SAP GUI·PC만" selected={!cbo.mobile} onClick={() => setCbo({ mobile: false })} />
                <Chip label="모바일·현장 단말" selected={cbo.mobile} onClick={() => setCbo({ mobile: true })} />
              </div>
            </Question>

            <Question no={7} title="입력 커버리지" hint="현업용이 아니라서 기본은 보정 없음입니다. 빠진 항목이 있을 때만 낮추세요.">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {COVERAGE_OPTIONS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    desc={o.desc}
                    selected={String(cbo.coverage) === o.value}
                    onClick={() => setCbo({ coverage: Number(o.value) as Coverage })}
                  />
                ))}
              </div>
            </Question>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> 범위 수정
            </button>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                미리보기: ILF {preview.counts.ilf} · EI {preview.counts.ei} · EO {preview.counts.eo} · 약 {fmtNum(preview.fp, 0)} FP
              </span>
              <button type="button" onClick={() => setStep(3)} className="btn-primary">
                <Calculator className="h-4 w-4" /> 비용 산정하기 <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <ResultView
          input={input}
          setInput={(p) => setOverrides((prev) => ({ ...prev, ...p, stack: "sap" }))}
          assumptions={conversion.assumptions}
          backLabel="규모 수정"
          onBack={() => setStep(2)}
          onReset={() => {
            setCboState(DEFAULT_CBO);
            setOverrides({});
            setStep(1);
          }}
        />
      )}
    </AppShell>
  );
}
