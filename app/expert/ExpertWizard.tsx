"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Home } from "lucide-react";
import {
  DEFAULT_INPUT,
  ENV_LABELS,
  PERF_LABELS,
  RATE_YEAR,
  SEC_LABELS,
  TEMPLATES,
  type EstimateInput,
  type FunctionCounts,
} from "@/lib/estimate";
import { Card, Field, LevelSelect, NumberInput, inputCls } from "@/components/ui";
import ResultView from "@/components/ResultView";
import AppShell from "@/components/AppShell";

const COUNT_FIELDS: { key: keyof FunctionCounts; label: string; hint: string }[] = [
  { key: "ilf", label: "관리하는 데이터 종류 (ILF)", hint: "이 시스템이 직접 저장·관리하는 데이터. 예: 신청서, 사용자, 부서, 코드" },
  { key: "eif", label: "참조만 하는 외부 데이터 (EIF)", hint: "다른 시스템에서 가져와 읽기만 하는 데이터. 예: 인사 조직도, 거래처 마스터" },
  { key: "ei", label: "입력·처리 기능 (EI)", hint: "등록, 수정, 삭제, 승인, 반려, 업로드 등 데이터를 바꾸는 기능 수" },
  { key: "eo", label: "리포트·통계·알림 (EO)", hint: "계산이나 집계가 들어간 출력물. 예: 월별 통계, 엑셀 다운로드, 메일 알림" },
  { key: "eq", label: "단순 조회 화면 (EQ)", hint: "목록 조회, 검색, 상세 보기처럼 계산 없이 보여주는 기능 수" },
];

function StepInput({ input, setInput, onNext }: { input: EstimateInput; setInput: (p: Partial<EstimateInput>) => void; onNext: () => void }) {
  const [templateId, setTemplateId] = useState("");

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setInput({
      title: input.title || t.name,
      description: input.description || t.description,
      mode: "detail",
      counts: t.counts,
      externalLinks: t.externalLinks,
      concurrentUsers: t.concurrentUsers,
      dataGb: t.dataGb,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-base font-semibold">1. 시스템 개요</h2>
        <p className="mt-1 text-sm text-muted-foreground">비슷한 유형을 고르면 기능 수가 자동으로 채워집니다. 이후 숫자를 실제 요구에 맞게 고치면 됩니다.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="시스템 이름">
            <input className={inputCls} value={input.title} placeholder="예: SAP ERP 구매·판매 구축" onChange={(e) => setInput({ title: e.target.value })} />
          </Field>
          <Field label="비슷한 유형 선택 (선택)">
            <select className={inputCls} value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">직접 입력</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="설명" hint="산정 결과 요약에 그대로 들어갑니다.">
            <textarea
              className={`${inputCls} min-h-[80px]`}
              value={input.description}
              placeholder="예: 구매요청→발주→입고와 판매·출하, FI 전표를 SAP ERP로 통합하고 WMS와 재고를 연계한다."
              onChange={(e) => setInput({ description: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">2. 기능 규모</h2>
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            {(["simple", "detail"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setInput({ mode: m })}
                className={`rounded-md px-3 py-1 ${input.mode === m ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "simple" ? "간편 입력" : "기능 유형별 입력"}
              </button>
            ))}
          </div>
        </div>

        {input.mode === "simple" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="화면 수" hint="메뉴에서 열리는 화면(목록·등록·상세·통계 등)을 모두 센 숫자. 팝업은 제외.">
              <NumberInput value={input.screens} onChange={(v) => setInput({ screens: v })} />
            </Field>
            <Field label="관리하는 데이터 종류 수" hint="예: 신청서, 사용자, 부서, 공통코드 → 4종">
              <NumberInput value={input.entities} onChange={(v) => setInput({ entities: v })} />
            </Field>
            <p className="text-xs text-muted-foreground md:col-span-2">
              간편 입력은 화면당 입력 1.0 · 출력 0.4 · 조회 0.8개, 데이터 종류당 외부참조 0.3개로 환산합니다.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {COUNT_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <NumberInput value={input.counts[f.key]} onChange={(v) => setInput({ counts: { ...input.counts, [f.key]: v } })} />
              </Field>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold">3. 환경·품질 요구 (보정계수)</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="연계할 외부 시스템 수" hint="인사(HR), 그룹웨어, ERP, SSO, 메일 등 데이터를 주고받는 시스템 수">
            <NumberInput value={input.externalLinks} onChange={(v) => setInput({ externalLinks: v })} />
          </Field>
          <Field label="모바일 대응">
            <select className={inputCls} value={input.mobile ? "y" : "n"} onChange={(e) => setInput({ mobile: e.target.value === "y" })}>
              <option value="n">PC 웹만</option>
              <option value="y">PC + 모바일(반응형)</option>
            </select>
          </Field>
          <Field label="성능 요구 수준">
            <LevelSelect value={input.perfLevel} labels={PERF_LABELS} onChange={(v) => setInput({ perfLevel: v })} />
          </Field>
          <Field label="운영환경 호환성">
            <LevelSelect value={input.envLevel} labels={ENV_LABELS} onChange={(v) => setInput({ envLevel: v })} />
          </Field>
          <Field label="보안 요구 수준" hint="보안 솔루션 구축비는 제외. 시큐어코딩 등 개발 과정에 녹아드는 요구만 반영">
            <LevelSelect value={input.secLevel} labels={SEC_LABELS} onChange={(v) => setInput({ secLevel: v })} />
          </Field>
          <Field label="동시 접속 사용자 (명)" hint="클라우드 인프라 규모 산정에만 사용">
            <NumberInput value={input.concurrentUsers} onChange={(v) => setInput({ concurrentUsers: v })} />
          </Field>
          <Field label="예상 데이터 용량 (GB, 3년 기준)" hint="첨부파일 포함. 클라우드 인프라 규모 산정에만 사용">
            <NumberInput value={input.dataGb} onChange={(v) => setInput({ dataGb: v })} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <button type="button" onClick={onNext} className="btn-primary">
          <Calculator className="h-4 w-4" /> 비용 산정하기 <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ExpertWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [input, setInputState] = useState<EstimateInput>(DEFAULT_INPUT);
  const setInput = (p: Partial<EstimateInput>) => setInputState((prev) => ({ ...prev, ...p }));

  return (
    <AppShell>
      <header className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={step === 1 ? "font-medium text-accent" : ""}>1. 요구사항 입력</span>
              <span>›</span>
              <span className={step === 2 ? "font-medium text-accent" : ""}>2. 비용 산정 결과</span>
            </div>
            <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground print:hidden">
              <Home className="h-3.5 w-3.5" /> 처음 화면
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold">시스템별 구축견적 산정 시스템 <span className="text-base font-normal text-muted-foreground">· IT 담당자용</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            기능 유형별 개수와 보정계수를 직접 입력합니다. Java + PostgreSQL 웹 시스템 기준, {RATE_YEAR}년 국내 공공 표준과 민간 시장 시세로 비교합니다.
          </p>
        </header>

        {step === 1 ? (
          <StepInput input={input} setInput={setInput} onNext={() => setStep(2)} />
        ) : (
          <ResultView
            channel="expert"
            input={input}
            setInput={setInput}
            onBack={() => setStep(1)}
            onReset={() => {
              setInputState(DEFAULT_INPUT);
              setStep(1);
            }}
          />
        )}
    </AppShell>
  );
}
